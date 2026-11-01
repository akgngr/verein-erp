"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { flatRateAmountCents, type FlatRateKind } from "../services/afa";
import { parseDateOnly } from "../utils";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d{1,9}([.,]\d{1,2})?$/;
const refresh = () => {
  revalidatePath("/muhasebe/ekler");
  revalidatePath("/muhasebe/vergi");
};
const date = (value: string) => {
  const parsed = parseDateOnly(value);
  if (!parsed) throw new ActionError("accounting.validation.bookingDateInvalid");
  return parsed;
};

const assetSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "accounting.extras.validation.name").max(150),
  acquisitionDate: z.string().regex(DATE, "accounting.validation.bookingDateInvalid"),
  cost: z.string().trim().regex(MONEY, "accounting.invoices.validation.price"),
  method: z.enum(["LINEAR", "GWG", "POOL"]),
  usefulLifeMonths: z.coerce.number().int().min(1).max(600),
  notes: z.string().trim().max(500).default(""),
});

/** Demirbaş kaydet (ACC-8). GWG yalnızca ≤ 800 € net, Sammelposten 250,01–1.000 € için. */
export async function saveAssetAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: assetSchema,
    handler: async ({ input, audit }) => {
      const costCents = toCents(input.cost) ?? 0;
      if (input.method === "GWG" && costCents > 80_000) throw new ActionError("accounting.extras.errors.gwgLimit");
      if (input.method === "POOL" && (costCents <= 25_000 || costCents > 100_000)) throw new ActionError("accounting.extras.errors.poolRange");
      const data = { name: input.name, acquisitionDate: date(input.acquisitionDate), costCents, method: input.method, usefulLifeMonths: input.usefulLifeMonths, notes: input.notes || null };
      const db = getDb();
      const saved = input.id ? await db.accountingAsset.update({ where: { id: input.id }, data }) : await db.accountingAsset.create({ data });
      await audit({ action: input.id ? "UPDATE" : "CREATE", entity: "AccountingAsset", entityId: saved.id, after: { costCents, method: input.method } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** Elden çıkarma (satış/hurda): o yıl kalan defter değeri giderleşir. */
export async function disposeAssetAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: z.object({ id: z.string().min(1), disposalDate: z.string().regex(DATE, "accounting.validation.bookingDateInvalid"), note: z.string().trim().max(300).default("") }),
    handler: async ({ input, audit }) => {
      await getDb().accountingAsset.update({ where: { id: input.id }, data: { disposalDate: date(input.disposalDate), disposalNote: input.note || null } });
      await audit({ action: "UPDATE", entity: "AccountingAsset", entityId: input.id, after: { disposal: input.disposalDate } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** Götürü gider ekle: tutar türün birim fiyatından hesaplanır (Homeoffice gün, km, Verpflegung gün). */
export async function addFlatRateAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: z.object({
      date: z.string().regex(DATE, "accounting.validation.bookingDateInvalid"),
      kind: z.enum(["HOME_OFFICE", "MILEAGE", "MEALS_8H", "MEALS_24H"]),
      quantity: z.string().trim().regex(/^\d{1,6}([.,]\d{1,2})?$/, "accounting.extras.validation.quantity"),
      note: z.string().trim().max(300).default(""),
    }),
    handler: async ({ input, audit }) => {
      const quantity = Number(input.quantity.replace(",", "."));
      if (!(quantity > 0)) throw new ActionError("accounting.extras.validation.quantity");
      const created = await getDb().accountingFlatRate.create({ data: { date: date(input.date), kind: input.kind, quantity: quantity.toFixed(2), amountCents: flatRateAmountCents(input.kind as FlatRateKind, quantity), note: input.note || null } });
      await audit({ action: "CREATE", entity: "AccountingFlatRate", entityId: created.id, after: { kind: input.kind, amountCents: created.amountCents } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function deleteFlatRateAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: z.object({ id: z.string().min(1) }),
    handler: async ({ input, audit }) => {
      await getDb().accountingFlatRate.delete({ where: { id: input.id } });
      await audit({ action: "DELETE", entity: "AccountingFlatRate", entityId: input.id });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** § 62 AO yedeği oluştur / çöz (Verein). */
export async function saveReserveAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: z.object({
      year: z.coerce.number().int().min(2000).max(2100),
      kind: z.enum(["FREE", "PURPOSE", "REPLACEMENT", "OPERATING"]),
      amount: z.string().trim().regex(MONEY, "accounting.invoices.validation.price"),
      purpose: z.string().trim().min(3, "accounting.extras.validation.purpose").max(300),
      plannedUseYear: z.string().trim().regex(/^(\d{4})?$/).default(""),
    }),
    handler: async ({ input, audit }) => {
      const created = await getDb().accountingReserve.create({ data: { year: input.year, kind: input.kind, amountCents: toCents(input.amount) ?? 0, purpose: input.purpose, plannedUseYear: input.plannedUseYear ? Number(input.plannedUseYear) : null } });
      await audit({ action: "CREATE", entity: "AccountingReserve", entityId: created.id, after: { kind: input.kind, amountCents: created.amountCents } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function releaseReserveAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: z.object({ id: z.string().min(1), year: z.coerce.number().int().min(2000).max(2100) }),
    handler: async ({ input, audit }) => {
      await getDb().accountingReserve.update({ where: { id: input.id }, data: { releasedYear: input.year } });
      await audit({ action: "UPDATE", entity: "AccountingReserve", entityId: input.id, after: { releasedYear: input.year } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
