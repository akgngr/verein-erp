"use client";

import { notify } from "@/shared/components/ui/notify";
import { Input, Label, Select, Spinner, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";

import {
  addFlatRateAction,
  deleteFlatRateAction,
  disposeAssetAction,
  linkAssetsToInventoryAction,
  releaseReserveAction,
  saveAssetAction,
  saveReserveAction,
} from "../actions/extras-actions";

const today = () => new Date().toISOString().slice(0, 10);

function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const submit = async (
    call: () => Promise<ActionResult>,
    success: string,
    reset?: () => void,
  ) => {
    setBusy(true);
    const result = await call();
    setBusy(false);
    if (!result.ok) return void notify.error(result.error);
    notify.success(success);
    reset?.();
    router.refresh();
  };
  return { busy, submit };
}

export function AssetForm() {
  const t = useTranslations("accounting.extras.assets");
  const { busy, submit } = useSubmit();
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [cost, setCost] = useState("");
  const costCents = toCents(cost) ?? 0;
  const [method, setMethod] = useState<"LINEAR" | "GWG" | "POOL">("LINEAR");
  const [months, setMonths] = useState("36");
  const [lastCost, setLastCost] = useState(0);
  if (costCents !== lastCost) {
    setLastCost(costCents);
    if (costCents) setMethod(costCents <= 80_000 ? "GWG" : "LINEAR");
  }
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-6">
      <TextField
        value={name}
        onChange={setName}
        className={["sm:col-span-2"].filter(Boolean).join(" ")}
      >
        <Label>{t("name")}</Label>
        <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
      </TextField>
      <TextField
        value={date}
        onChange={setDate}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("date")}</Label>
        <Input
          type="date"
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <TextField
        value={cost}
        onChange={setCost}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("cost")}</Label>
        <Input
          placeholder="0,00"
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <Select
        value={method}
        onChange={(selectedValue) => {
          const keys =
            selectedValue === null ? undefined : String(selectedValue);
          return setMethod((String(keys ?? "") || "LINEAR") as typeof method);
        }} size="sm">
        <Label>{t("method")}</Label>
            {(["LINEAR", "GWG", "POOL"] as const).map((value) => (
              <Select.Item
                key={value}
                id={value}
                textValue={String(t(`methods.${value}`))}
              >
                <Label>{t(`methods.${value}`)}</Label>
              </Select.Item>
            ))}
      </Select>
      <TextField
        value={months}
        isDisabled={method !== "LINEAR"}
        onChange={setMonths}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("months")}</Label>
        <Input
          type="number"
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <Button
        className="sm:col-span-6 sm:justify-self-start"
        size="sm"
        isDisabled={name.trim().length < 2 || !costCents}
        onPress={() =>
          submit(
            () =>
              saveAssetAction({
                name,
                acquisitionDate: date,
                cost,
                method,
                usefulLifeMonths: method === "LINEAR" ? months : "1",
                notes: "",
              }),
            t("saved"),
            () => {
              setName("");
              setCost("");
            },
          )
        }
        variant={actionVariant("primary", "solid")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" tone="current" /> : null}
        {<Plus className="h-4 w-4" aria-hidden />}
        {t("add")}
      </Button>
    </div>
  );
}

export function DisposeAssetButton({ id }: { id: string }) {
  const t = useTranslations("accounting.extras.assets");
  const { busy, submit } = useSubmit();
  return (
    <Button
      size="sm"
      onPress={() =>
        submit(
          () => disposeAssetAction({ id, disposalDate: today(), note: "" }),
          t("disposed"),
        )
      }
      variant={actionVariant("default", "light")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" tone="current" /> : null}
      {t("dispose")}
    </Button>
  );
}

/** Envanter modülü etkinken: bağlantısız demirbaşları envantere ekler. */
export function LinkInventoryButton() {
  const t = useTranslations("accounting.extras.assets");
  const { busy, submit } = useSubmit();
  return (
    <Button
      size="sm"
      onPress={() =>
        submit(async () => {
          const r = await linkAssetsToInventoryAction({});
          return r.ok ? { ok: true as const, data: undefined } : r;
        }, t("inventoryLinked"))
      }
      variant={actionVariant("default", "flat")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" tone="current" /> : null}
      {t("linkInventory")}
    </Button>
  );
}

export function FlatRateForm() {
  const t = useTranslations("accounting.extras.flat");
  const { busy, submit } = useSubmit();
  const [kind, setKind] = useState<
    "HOME_OFFICE" | "MILEAGE" | "MEALS_8H" | "MEALS_24H"
  >("HOME_OFFICE");
  const [date, setDate] = useState(today());
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
      <Select
        value={kind}
        onChange={(selectedValue) => {
          const keys =
            selectedValue === null ? undefined : String(selectedValue);
          return setKind((String(keys ?? "") || "HOME_OFFICE") as typeof kind);
        }} size="sm">
        <Label>{t("kind")}</Label>
            {(["HOME_OFFICE", "MILEAGE", "MEALS_8H", "MEALS_24H"] as const).map(
              (value) => (
                <Select.Item
                  key={value}
                  id={value}
                  textValue={String(t(`kinds.${value}`))}
                >
                  <Label>{t(`kinds.${value}`)}</Label>
                </Select.Item>
              ),
            )}
      </Select>
      <TextField
        value={date}
        onChange={setDate}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("date")}</Label>
        <Input
          type="date"
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <TextField
        value={quantity}
        onChange={setQuantity}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t(`unit.${kind}`)}</Label>
        <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
      </TextField>
      <TextField
        value={note}
        onChange={setNote}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("note")}</Label>
        <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
      </TextField>
      <Button
        size="sm"
        isDisabled={!quantity}
        onPress={() =>
          submit(
            () => addFlatRateAction({ kind, date, quantity, note }),
            t("saved"),
            () => {
              setQuantity("");
              setNote("");
            },
          )
        }
        variant={actionVariant("primary", "solid")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" tone="current" /> : null}
        {<Plus className="h-4 w-4" aria-hidden />}
        {t("add")}
      </Button>
    </div>
  );
}

export function DeleteFlatRateButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { busy, submit } = useSubmit();
  return (
    <Button
      size="sm"
      isIconOnly
      aria-label={label}
      onPress={() => submit(() => deleteFlatRateAction({ id }), label)}
      variant={actionVariant("danger", "light")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" tone="current" /> : null}
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  );
}

export function ReserveForm({ year }: { year: number }) {
  const t = useTranslations("accounting.extras.reserves");
  const { busy, submit } = useSubmit();
  const [kind, setKind] = useState<
    "FREE" | "PURPOSE" | "REPLACEMENT" | "OPERATING"
  >("PURPOSE");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [planned, setPlanned] = useState("");
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
      <Select
        value={kind}
        onChange={(selectedValue) => {
          const keys =
            selectedValue === null ? undefined : String(selectedValue);
          return setKind((String(keys ?? "") || "PURPOSE") as typeof kind);
        }} size="sm">
        <Label>{t("kind")}</Label>
            {(["PURPOSE", "REPLACEMENT", "OPERATING", "FREE"] as const).map(
              (value) => (
                <Select.Item
                  key={value}
                  id={value}
                  textValue={String(t(`kinds.${value}`))}
                >
                  <Label>{t(`kinds.${value}`)}</Label>
                </Select.Item>
              ),
            )}
      </Select>
      <TextField
        value={amount}
        onChange={setAmount}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("amount")}</Label>
        <Input
          placeholder="0,00"
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <TextField
        value={purpose}
        onChange={setPurpose}
        className={["sm:col-span-2"].filter(Boolean).join(" ")}
      >
        <Label>{t("purpose")}</Label>
        <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
      </TextField>
      <TextField
        value={planned}
        onChange={setPlanned}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("plannedUse")}</Label>
        <Input
          placeholder={String(year + 2)}
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <Button
        className="sm:col-span-5 sm:justify-self-start"
        size="sm"
        isDisabled={!amount || purpose.trim().length < 3}
        onPress={() =>
          submit(
            () =>
              saveReserveAction({
                year,
                kind,
                amount,
                purpose,
                plannedUseYear: planned,
              }),
            t("saved"),
            () => {
              setAmount("");
              setPurpose("");
              setPlanned("");
            },
          )
        }
        variant={actionVariant("primary", "solid")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" tone="current" /> : null}
        {<Plus className="h-4 w-4" aria-hidden />}
        {t("add")}
      </Button>
    </div>
  );
}

export function ReleaseReserveButton({
  id,
  year,
}: {
  id: string;
  year: number;
}) {
  const t = useTranslations("accounting.extras.reserves");
  const { busy, submit } = useSubmit();
  return (
    <Button
      size="sm"
      onPress={() =>
        submit(() => releaseReserveAction({ id, year }), t("released"))
      }
      variant={actionVariant("default", "light")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" tone="current" /> : null}
      {t("release")}
    </Button>
  );
}
