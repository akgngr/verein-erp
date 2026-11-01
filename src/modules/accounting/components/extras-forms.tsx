"use client";

import { addToast, Button, Input, Select, SelectItem } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";

import { addFlatRateAction, deleteFlatRateAction, disposeAssetAction, releaseReserveAction, saveAssetAction, saveReserveAction } from "../actions/extras-actions";
import { selectionKey } from "./bank-import-card";

const today = () => new Date().toISOString().slice(0, 10);

function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const submit = async (call: () => Promise<ActionResult>, success: string, reset?: () => void) => {
    setBusy(true);
    const result = await call();
    setBusy(false);
    if (!result.ok) return void addToast({ title: result.error, color: "danger" });
    addToast({ title: success, color: "success" });
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
      <Input className="sm:col-span-2" size="sm" label={t("name")} labelPlacement="outside" value={name} onValueChange={setName} />
      <Input size="sm" type="date" label={t("date")} labelPlacement="outside" value={date} onValueChange={setDate} />
      <Input size="sm" label={t("cost")} labelPlacement="outside" value={cost} onValueChange={setCost} placeholder="0,00" />
      <Select size="sm" label={t("method")} labelPlacement="outside" selectedKeys={[method]} onSelectionChange={(keys) => setMethod((selectionKey(keys) || "LINEAR") as typeof method)}>
        {(["LINEAR", "GWG", "POOL"] as const).map((value) => (
          <SelectItem key={value}>{t(`methods.${value}`)}</SelectItem>
        ))}
      </Select>
      <Input size="sm" type="number" label={t("months")} labelPlacement="outside" value={months} onValueChange={setMonths} isDisabled={method !== "LINEAR"} />
      <Button className="sm:col-span-6 sm:justify-self-start" size="sm" color="primary" startContent={<Plus className="h-4 w-4" aria-hidden />} isLoading={busy} isDisabled={name.trim().length < 2 || !costCents} onPress={() => submit(() => saveAssetAction({ name, acquisitionDate: date, cost, method, usefulLifeMonths: method === "LINEAR" ? months : "1", notes: "" }), t("saved"), () => { setName(""); setCost(""); })}>
        {t("add")}
      </Button>
    </div>
  );
}

export function DisposeAssetButton({ id }: { id: string }) {
  const t = useTranslations("accounting.extras.assets");
  const { busy, submit } = useSubmit();
  return (
    <Button size="sm" variant="light" isLoading={busy} onPress={() => submit(() => disposeAssetAction({ id, disposalDate: today(), note: "" }), t("disposed"))}>
      {t("dispose")}
    </Button>
  );
}

export function FlatRateForm() {
  const t = useTranslations("accounting.extras.flat");
  const { busy, submit } = useSubmit();
  const [kind, setKind] = useState<"HOME_OFFICE" | "MILEAGE" | "MEALS_8H" | "MEALS_24H">("HOME_OFFICE");
  const [date, setDate] = useState(today());
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
      <Select size="sm" label={t("kind")} labelPlacement="outside" selectedKeys={[kind]} onSelectionChange={(keys) => setKind((selectionKey(keys) || "HOME_OFFICE") as typeof kind)}>
        {(["HOME_OFFICE", "MILEAGE", "MEALS_8H", "MEALS_24H"] as const).map((value) => (
          <SelectItem key={value}>{t(`kinds.${value}`)}</SelectItem>
        ))}
      </Select>
      <Input size="sm" type="date" label={t("date")} labelPlacement="outside" value={date} onValueChange={setDate} />
      <Input size="sm" label={t(`unit.${kind}`)} labelPlacement="outside" value={quantity} onValueChange={setQuantity} />
      <Input size="sm" label={t("note")} labelPlacement="outside" value={note} onValueChange={setNote} />
      <Button size="sm" color="primary" startContent={<Plus className="h-4 w-4" aria-hidden />} isLoading={busy} isDisabled={!quantity} onPress={() => submit(() => addFlatRateAction({ kind, date, quantity, note }), t("saved"), () => { setQuantity(""); setNote(""); })}>
        {t("add")}
      </Button>
    </div>
  );
}

export function DeleteFlatRateButton({ id, label }: { id: string; label: string }) {
  const { busy, submit } = useSubmit();
  return (
    <Button size="sm" variant="light" color="danger" isIconOnly aria-label={label} isLoading={busy} onPress={() => submit(() => deleteFlatRateAction({ id }), label)}>
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  );
}

export function ReserveForm({ year }: { year: number }) {
  const t = useTranslations("accounting.extras.reserves");
  const { busy, submit } = useSubmit();
  const [kind, setKind] = useState<"FREE" | "PURPOSE" | "REPLACEMENT" | "OPERATING">("PURPOSE");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [planned, setPlanned] = useState("");
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
      <Select size="sm" label={t("kind")} labelPlacement="outside" selectedKeys={[kind]} onSelectionChange={(keys) => setKind((selectionKey(keys) || "PURPOSE") as typeof kind)}>
        {(["PURPOSE", "REPLACEMENT", "OPERATING", "FREE"] as const).map((value) => (
          <SelectItem key={value}>{t(`kinds.${value}`)}</SelectItem>
        ))}
      </Select>
      <Input size="sm" label={t("amount")} labelPlacement="outside" value={amount} onValueChange={setAmount} placeholder="0,00" />
      <Input size="sm" className="sm:col-span-2" label={t("purpose")} labelPlacement="outside" value={purpose} onValueChange={setPurpose} />
      <Input size="sm" label={t("plannedUse")} labelPlacement="outside" value={planned} onValueChange={setPlanned} placeholder={String(year + 2)} />
      <Button className="sm:col-span-5 sm:justify-self-start" size="sm" color="primary" startContent={<Plus className="h-4 w-4" aria-hidden />} isLoading={busy} isDisabled={!amount || purpose.trim().length < 3} onPress={() => submit(() => saveReserveAction({ year, kind, amount, purpose, plannedUseYear: planned }), t("saved"), () => { setAmount(""); setPurpose(""); setPlanned(""); })}>
        {t("add")}
      </Button>
    </div>
  );
}

export function ReleaseReserveButton({ id, year }: { id: string; year: number }) {
  const t = useTranslations("accounting.extras.reserves");
  const { busy, submit } = useSubmit();
  return (
    <Button size="sm" variant="light" isLoading={busy} onPress={() => submit(() => releaseReserveAction({ id, year }), t("released"))}>
      {t("release")}
    </Button>
  );
}
