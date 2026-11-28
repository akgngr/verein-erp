"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import { dataTableSelectionSchema, type DataTableSelection } from "@/shared/data-table/selection-contract";
import { parseBulkSelection } from "@/shared/data-table/server-selection";
import { getDb } from "@/shared/db";
import type { ListParams } from "@/shared/list-params";
import type { ActionResult } from "@/shared/types/action";

import { SPONSOR_STATUSES } from "../constants";
import { sponsorsPermissions } from "../permissions";
import {
  buildSponsorWhere,
  SPONSOR_DEFAULT_SORT,
  SPONSOR_SORTABLE_FIELDS,
  type SponsorFilterKeys,
} from "../queries/list-sponsors";

const BULK_FILTER_KEYS = ["status", "tier"] as const;

const bulkChangeStatusSchema = z
  .object({
    selection: dataTableSelectionSchema,
    status: z.enum(SPONSOR_STATUSES),
  })
  .strict();

function queryToListParams(
  query: Extract<DataTableSelection, { type: "query" }>["query"],
): ListParams<SponsorFilterKeys> {
  const filters: Partial<Record<SponsorFilterKeys, string>> = {};
  if (query.filters.status) filters.status = query.filters.status;
  if (query.filters.tier) filters.tier = query.filters.tier;
  const sort =
    query.sort && SPONSOR_SORTABLE_FIELDS.includes(query.sort as (typeof SPONSOR_SORTABLE_FIELDS)[number])
      ? query.sort
      : SPONSOR_DEFAULT_SORT;
  return {
    page: 1,
    pageSize: 10,
    q: query.q ?? "",
    sort,
    dir: query.dir ?? "desc",
    filters,
    skip: 0,
    take: 10,
  };
}

function selectionWhere(selection: DataTableSelection): Prisma.SponsorWhereInput {
  if (selection.type === "explicit") return { id: { in: selection.ids } };
  const base = buildSponsorWhere(queryToListParams(selection.query));
  if (selection.excludedIds.length === 0) return base;
  return { AND: [base, { id: { notIn: selection.excludedIds } }] };
}

export async function bulkChangeSponsorStatusAction(
  input: unknown,
): Promise<ActionResult<{ updated: number; skipped: number }>> {
  return createAction({
    permission: { definition: sponsorsPermissions, action: "update" },
    schema: bulkChangeStatusSchema,
    handler: async ({ input, audit }) => {
      const selection = parseBulkSelection(input.selection, {
        allowedFilterKeys: BULK_FILTER_KEYS,
      });
      const where = selectionWhere(selection);
      const db = getDb();
      const selectedTotal = await db.sponsor.count({ where });
      if (selectedTotal === 0) return { updated: 0, skipped: 0 };

      const result = await db.sponsor.updateMany({
        where: { AND: [where, { status: { not: input.status } }] },
        data: { status: input.status },
      });
      const skipped = Math.max(0, selectedTotal - result.count);
      await audit({
        action: "UPDATE",
        entity: "SponsorBulk",
        entityId: "bulk-status",
        before: { selectionType: selection.type, selectedCount: selectedTotal },
        after: { targetStatus: input.status, updatedCount: result.count, skippedCount: skipped },
      });
      revalidatePath("/sponsors");
      return { updated: result.count, skipped };
    },
  })(input);
}
