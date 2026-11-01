"use client";

import { addToast, Button, Input } from "@heroui/react";
import { Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createCashClosingAction, sealJournalAction } from "../actions/gobd-actions";

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export function SealJournalButton() {
  const t = useTranslations("accounting.gobd");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      color="primary"
      variant="flat"
      startContent={<ShieldCheck className="h-4 w-4" aria-hidden />}
      isLoading={busy}
      onPress={async () => {
        setBusy(true);
        const result = await sealJournalAction({});
        setBusy(false);
        if (!result.ok) return void addToast({ title: result.error, color: "danger" });
        addToast({ title: t("sealed", { count: result.data.sealed }), color: "success" });
        router.refresh();
      }}
    >
      {t("seal")}
    </Button>
  );
}

/** Kasa günlük kapanışı: tarih + sayılan tutar → fark gösterilir; kapanış kesindir. */
export function CashClosingForm({ accountId, defaultDate }: { accountId: string; defaultDate: string }) {
  const t = useTranslations("accounting.gobd.cash");
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input type="date" size="sm" label={t("date")} labelPlacement="outside" value={date} max={defaultDate} onValueChange={setDate} className="max-w-40" />
      <Input size="sm" label={t("counted")} labelPlacement="outside" value={counted} onValueChange={setCounted} placeholder="0,00" className="max-w-36" />
      <Input size="sm" label={t("note")} labelPlacement="outside" value={note} onValueChange={setNote} className="max-w-56" />
      <Button
        size="sm"
        color="warning"
        startContent={<Lock className="h-4 w-4" aria-hidden />}
        isDisabled={!date || !counted}
        isLoading={busy}
        onPress={async () => {
          setBusy(true);
          const result = await createCashClosingAction({ accountId, date, counted, note });
          setBusy(false);
          if (!result.ok) return void addToast({ title: result.error, color: "danger" });
          addToast({ title: result.data.differenceCents ? t("closedDifference", { amount: euro(result.data.differenceCents) }) : t("closed"), color: result.data.differenceCents ? "warning" : "success" });
          setCounted("");
          setNote("");
          router.refresh();
        }}
      >
        {t("close")}
      </Button>
    </div>
  );
}
