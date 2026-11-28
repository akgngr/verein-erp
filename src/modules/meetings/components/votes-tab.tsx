"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button, Input, Label, Select, StatusChip, TextField } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { closeVoteAction, issueBallotAction, openVoteAction } from "../actions/vote-actions";
import { DEFAULT_MIN_BALLOTS, LOWEST_MIN_BALLOTS, YES_NO_ABSTAIN } from "../lib/secret-ballot";

export type VoteRow = {
  id: string;
  question: string;
  options: string[];
  minBallots: number;
  minBallotsReason: string | null;
  status: "OPEN" | "CLOSED";
  totals: Record<string, number> | null;
  ballotCount: number;
  ballotHash: string | null;
  receipts: string[];
  closedAt: string | null;
  retainUntil: string | null;
  issued: number;
  issuedMemberIds: string[];
};

/**
 * Gizli oylama sekmesi (RFC-004 aşama 3, yüz yüze). Giriş masası: yoklamada "katıldı" olan üyeye tek kullanımlık
 * kod verilir (yazdır / kabinde göster). Oylar /oy kabininde kullanılır. Kapanışta sonuç, makbuz listesi ve özet.
 */
export function VotesTab({ meetingId, votes, present, agendaItems, editable }: { meetingId: string; votes: VoteRow[]; present: { memberId: string; name: string; weight?: number }[]; agendaItems: { id: string; position: number; title: string }[]; editable: boolean }) {
  const t = useTranslations("meetings.vote");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ question: "", kind: "yesNoAbstain" as "yesNoAbstain" | "candidates", candidates: "", minBallots: String(DEFAULT_MIN_BALLOTS), reason: "", agendaItemId: "" });
  const [code, setCode] = useState<{ name: string; codes: string[] } | null>(null);
  const [closingVoteId, setClosingVoteId] = useState<string | null>(null);
  const label = (option: string) => ((YES_NO_ABSTAIN as readonly string[]).includes(option) ? t(`options.${option}` as never) : option);
  const min = Number(form.minBallots);

  const open = () =>
    start(async () => {
      const result = await openVoteAction({
        meetingId, question: form.question, kind: form.kind, agendaItemId: form.agendaItemId || null,
        candidates: form.candidates.split("\n").map((line) => line.trim()).filter(Boolean),
        minBallots: Number.isFinite(min) ? min : DEFAULT_MIN_BALLOTS, minBallotsReason: form.reason || null,
      });
      if (!result.ok) return void notify.error(translate(result.error));
      notify.success(t("opened"));
      setForm({ ...form, question: "", candidates: "", reason: "" });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-600">{t("intro")}</p>

      {code ? (
        <section className="print-area flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary-400 p-6 text-center" aria-live="assertive">
          <p className="text-sm text-ink-600">{t("codeFor", { name: code.name })}</p>
          <div className="flex flex-col gap-1">
            {code.codes.map((singleCode) => (
              <p key={singleCode} className="font-mono text-2xl tracking-widest">{singleCode}</p>
            ))}
          </div>
          <p className="text-sm">{t("codeHint")}</p>
          <div className="flex gap-2 print:hidden">
            <Button size="sm" variant={actionVariant("primary", "flat")} onPress={() => window.print()}>{t("print")}</Button>
            <Button size="sm" variant={actionVariant("default", "light")} onPress={() => setCode(null)}>{t("hideCode")}</Button>
          </div>
        </section>
      ) : null}

      {votes.map((vote) => (
        <section key={vote.id} className="flex flex-col gap-3 rounded-xl border border-ink-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{vote.question}</h3>
            <StatusChip tone={vote.status === "OPEN" ? "primary" : "default"}>{t(`status.${vote.status}`)}</StatusChip>
          </div>
          <p className="text-sm text-ink-600">
            {t("options.list", { options: vote.options.map(label).join(" · ") })} · {t("issuedCount", { count: vote.issued })} · {t("minBallotsInfo", { count: vote.minBallots })}
            {vote.minBallotsReason ? ` (${vote.minBallotsReason})` : ""}
          </p>
          {vote.status === "OPEN" && editable ? (
            <>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {present.map((member) => {
                  const done = vote.issuedMemberIds.includes(member.memberId);
                  const weight = member.weight ?? 1;
                  return (
                    <li key={member.memberId} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm">
                      <span>
                        {member.name}
                        {weight > 1 ? (
                          <span className="ml-1.5 rounded bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-700">
                            {t("proxyWeight", { weight })}
                          </span>
                        ) : null}
                      </span>
                      {done ? (
                        <span className="text-xs text-ink-500">{t("issued")}</span>
                      ) : (
                        <Button size="sm" variant={actionVariant("primary", "light")} isDisabled={pending} onPress={() => start(async () => {
                          const result = await issueBallotAction({ meetingId, voteId: vote.id, memberId: member.memberId });
                          if (!result.ok) return void notify.error(translate(result.error));
                          setCode({ name: member.name, codes: result.data.codes });
                          router.refresh();
                        })}>
                          {t("issue")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!present.length ? <p className="text-sm text-warning-700">{t("noPresent")}</p> : null}
              <p className="text-sm">{t("boothHint")}</p>
              <Button className="self-start" variant={actionVariant("danger", "solid")} isPending={pending} onPress={() => setClosingVoteId(vote.id)}>
                {t("close")}
              </Button>
            </>
          ) : null}
          {vote.status === "CLOSED" ? (
            <div className="flex flex-col gap-2 text-sm">
              {vote.totals ? (
                <ul className="flex flex-col gap-1">
                  {vote.options.map((option) => <li key={option}>{label(option)}: <strong>{vote.totals?.[option] ?? 0}</strong></li>)}
                </ul>
              ) : (
                <p className="text-warning-700">{t("withheld", { count: vote.ballotCount, min: vote.minBallots })}</p>
              )}
              <p>{t("ballotCount", { count: vote.ballotCount })}</p>
              {vote.ballotHash ? <p className="break-all font-mono text-xs">{t("hash")}: {vote.ballotHash}</p> : null}
              {vote.receipts.length ? (
                <details>
                  <summary className="cursor-pointer">{t("receipts", { count: vote.receipts.length })}</summary>
                  <p className="mt-2 font-mono text-xs leading-6">{vote.receipts.join("  ")}</p>
                </details>
              ) : null}
              <p className="text-xs text-ink-500">{t("cannotCheck")}</p>
              {vote.retainUntil ? <p className="text-xs text-ink-500">{t("retention", { date: vote.retainUntil })}</p> : null}
            </div>
          ) : null}
        </section>
      ))}

      {editable ? (
        <section className="flex flex-col gap-3 rounded-xl border border-ink-200 p-4">
          <h3 className="font-semibold">{t("new")}</h3>
          <TextField value={form.question} onChange={(question) => setForm({ ...form, question })} className="w-full">
            <Label>{t("question")}</Label>
            <Input placeholder=" " maxLength={300} />
          </TextField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select id="vote-kind" value={form.kind} onChange={(value) => setForm({ ...form, kind: String(value ?? form.kind) as typeof form.kind })}>
              <Label>{t("kind")}</Label>
              {(["yesNoAbstain", "candidates"] as const).map((key) => (
                <Select.Item key={key} id={key} textValue={t(`kinds.${key}`)}><Label>{t(`kinds.${key}`)}</Label></Select.Item>
              ))}
            </Select>
            <Select id="vote-agenda" value={form.agendaItemId || "none"} onChange={(value) => setForm({ ...form, agendaItemId: value && value !== "none" ? String(value) : "" })}>
              <Label>{t("agendaItem")}</Label>
              {[{ id: "none", label: t("noAgendaItem") }, ...agendaItems.map((item) => ({ id: item.id, label: `${item.position}. ${item.title}` }))].map((item) => (
                <Select.Item key={item.id} id={item.id} textValue={item.label}><Label>{item.label}</Label></Select.Item>
              ))}
            </Select>
            <TextField value={form.minBallots} onChange={(minBallots) => setForm({ ...form, minBallots })} className="w-full">
              <Label>{t("minBallots")}</Label>
              <Input inputMode="numeric" placeholder=" " />
            </TextField>
          </div>
          {form.kind === "candidates" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("candidates")}</span>
              <textarea className="min-h-24 rounded border border-ink-200 bg-surface p-2" value={form.candidates} onChange={(event) => setForm({ ...form, candidates: event.target.value })} />
            </label>
          ) : null}
          {Number.isFinite(min) && min < DEFAULT_MIN_BALLOTS ? (
            <TextField value={form.reason} onChange={(reason) => setForm({ ...form, reason })} className="w-full">
              <Label>{t("minBallotsReason", { min: LOWEST_MIN_BALLOTS })}</Label>
              <Input placeholder=" " maxLength={300} />
            </TextField>
          ) : null}
          <Button className="self-start" variant={actionVariant("primary", "solid")} isPending={pending} isDisabled={form.question.trim().length < 3} onPress={open}>{t("open")}</Button>
        </section>
      ) : null}
      <ConfirmDialog
        isOpen={closingVoteId !== null}
        onOpenChange={(open) => {
          if (!open) setClosingVoteId(null);
        }}
        title={t("close")}
        message={t("closeConfirm")}
        confirmLabel={t("close")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!closingVoteId) return;
          const result = await closeVoteAction({ meetingId, voteId: closingVoteId, decisionText: null });
          if (!result.ok) {
            notify.error(translate(result.error));
            return;
          }
          notify.success(result.data.published ? t("closed") : t("closedWithheld", { count: result.data.ballotCount }));
          setClosingVoteId(null);
          router.refresh();
        }}
      />
    </div>
  );
}
