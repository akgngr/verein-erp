"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { castBallotAction, loadBallotAction } from "../actions/public-vote-actions";
import { YES_NO_ABSTAIN } from "../lib/secret-ballot";

type Ballot = { question: string; options: string[] };

/**
 * Oy kabini (kiosk / kendi cihazı). Seçim yalnız bu tarayıcı sekmesinde tutulur; gönderince kod harcanır ve
 * seçimi açığa vurmayan bir makbuz kodu gösterilir. Hiçbir kişi bilgisi gösterilmez veya istenmez.
 */
export function VoteBooth() {
  const t = useTranslations("meetings.vote.booth");
  const tv = useTranslations("meetings.vote");
  const [code, setCode] = useState("");
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = (option: string) => ((YES_NO_ABSTAIN as readonly string[]).includes(option) ? tv(`options.${option}` as never) : option);
  const reset = () => { setCode(""); setBallot(null); setChoice(null); setReceipt(null); setError(null); };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 rounded-xl bg-surface p-6 shadow-sm sm:p-8" aria-live="polite">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {receipt ? (
        <section className="flex flex-col gap-3">
          <p className="text-lg font-medium text-success-700">{t("thanks")}</p>
          <p>{t("receiptText")}</p>
          <p className="rounded-lg bg-ink-50 p-4 text-center font-mono text-2xl tracking-widest" aria-label={t("receiptLabel")}>{receipt}</p>
          <p className="text-sm text-ink-600">{t("receiptHint")}</p>
          <Button variant={actionVariant("primary", "solid")} onPress={reset}>{t("next")}</Button>
        </section>
      ) : ballot ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!choice) return;
            start(async () => {
              const result = await castBallotAction({ code, choice });
              if (!result.ok) return void setError(t(`errors.${result.error}`));
              setReceipt(result.receipt);
              setCode("");
            });
          }}
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-lg font-medium">{ballot.question}</legend>
            {ballot.options.map((option) => (
              <label key={option} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-ink-200 px-4 py-3 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                <input type="radio" name="choice" value={option} checked={choice === option} onChange={() => setChoice(option)} className="size-5" />
                <span className="text-base">{label(option)}</span>
              </label>
            ))}
          </fieldset>
          {error ? <p role="alert" className="text-danger">{error}</p> : null}
          <p className="text-sm text-ink-600">{t("secretNote")}</p>
          <div className="flex gap-2">
            <Button type="submit" variant={actionVariant("primary", "solid")} isDisabled={!choice} isPending={pending}>{t("cast")}</Button>
            <Button variant={actionVariant("default", "light")} onPress={reset}>{t("cancel")}</Button>
          </div>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await loadBallotAction({ code });
              if (!result.ok) return void setError(t(`errors.${result.error}`));
              setError(null);
              setBallot({ question: result.question, options: result.options });
            });
          }}
        >
          <p className="text-ink-600">{t("intro")}</p>
          <TextField value={code} onChange={setCode} className="w-full">
            <Label>{t("codeLabel")}</Label>
            <Input autoComplete="off" className="font-mono tracking-wider" placeholder=" " />
          </TextField>
          {error ? <p role="alert" className="text-danger">{error}</p> : null}
          <Button type="submit" variant={actionVariant("primary", "solid")} isDisabled={code.trim().length < 10} isPending={pending}>{t("open")}</Button>
          <details className="text-sm text-ink-600">
            <summary className="cursor-pointer">{t("howTitle")}</summary>
            <p className="mt-2">{t("howText")}</p>
          </details>
        </form>
      )}
    </main>
  );
}
