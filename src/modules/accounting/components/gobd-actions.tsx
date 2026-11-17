"use client";
import { Button, toast } from "@heroui/react";
import { Input, Label, Spinner, TextField } from "@/shared/components/kit";

import { statusTone } from "@/shared/components/ui/status-appearance";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  createCashClosingAction,
  sealJournalAction,
} from "../actions/gobd-actions";

const euro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export function SealJournalButton() {
  const t = useTranslations("accounting.gobd");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      onPress={async () => {
        setBusy(true);
        const result = await sealJournalAction({});
        setBusy(false);
        if (!result.ok) return void toast(result.error, { variant: "danger" });
        toast(t("sealed", { count: result.data.sealed }), {
          variant: "success",
        });
        router.refresh();
      }}
      variant={actionVariant("primary", "flat")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" tone="current" /> : null}
      {<ShieldCheck className="h-4 w-4" aria-hidden />}
      {t("seal")}
    </Button>
  );
}

/** Kasa günlük kapanışı: tarih + sayılan tutar → fark gösterilir; kapanış kesindir. */
export function CashClosingForm({
  accountId,
  defaultDate,
}: {
  accountId: string;
  defaultDate: string;
}) {
  const t = useTranslations("accounting.gobd.cash");
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <TextField
        value={date}
        onChange={setDate}
        className={["max-w-40"].filter(Boolean).join(" ")}
      >
        <Label>{t("date")}</Label>
        <Input
          type="date"
          max={defaultDate}
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <TextField
        value={counted}
        onChange={setCounted}
        className={["max-w-36"].filter(Boolean).join(" ")}
      >
        <Label>{t("counted")}</Label>
        <Input
          placeholder="0,00"
          className={["h-9 text-sm"].filter(Boolean).join(" ")}
        />
      </TextField>
      <TextField
        value={note}
        onChange={setNote}
        className={["max-w-56"].filter(Boolean).join(" ")}
      >
        <Label>{t("note")}</Label>
        <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
      </TextField>
      <Button
        size="sm"
        isDisabled={!date || !counted}
        onPress={async () => {
          setBusy(true);
          const result = await createCashClosingAction({
            accountId,
            date,
            counted,
            note,
          });
          setBusy(false);
          if (!result.ok)
            return void toast(result.error, { variant: "danger" });
          toast(
            result.data.differenceCents
              ? t("closedDifference", {
                  amount: euro(result.data.differenceCents),
                })
              : t("closed"),
            {
              variant: statusTone(
                result.data.differenceCents ? "warning" : "success",
              ),
            },
          );
          setCounted("");
          setNote("");
          router.refresh();
        }}
        variant={actionVariant("warning", "solid")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" tone="current" /> : null}
        {<Lock className="h-4 w-4" aria-hidden />}
        {t("close")}
      </Button>
    </div>
  );
}
