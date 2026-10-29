"use client";

import { Button, Checkbox, Radio, RadioGroup, addToast } from "@heroui/react";
import { CheckCircle2, ChevronDown, FileDown, XCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { amountToGermanWords } from "@/shared/german-number-words";
import { formatMoney } from "@/shared/money";
import { cn, formatDate } from "@/shared/utils";

import { issueBatchAction, issueConfirmationAction } from "../actions/confirmation-actions";

export type IssueMode = "tek" | "toplu" | "aidat" | "yillik";

export type IssueCandidateRow = {
  sourceId: string;
  /** ISO tarih (sunucu → istemci serileştirme). */
  itemDate: string;
  amountCents: number;
  waived: boolean;
  sourceNumber: string;
};

type Recipient = { id: string; label: string };
type BatchResult = { recipientId: string; ok: boolean; confirmationNumber?: string; error?: string };

/** URL parametresini değiştirir; adım durumu adreste tutulur (geri tuşu ve paylaşım çalışır). */
function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  };
}

/** Stillendirilmiş native select (HeroUI Select SSR'de react-aria kimlik uyuşmazlığı üretir). */
function NativeSelect({
  id,
  label,
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className={cn("flex flex-col gap-1.5 text-small", className)}>
      <span className="font-medium text-foreground">{label}</span>
      <span className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-medium border border-default-200 bg-default-100 pl-3 pr-9 text-small text-foreground outline-none transition-colors hover:bg-default-200 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-default-500" aria-hidden />
      </span>
    </label>
  );
}

/** Yıl ve alıcı seçimi (bağışçı/üye); seçim URL'ye yazılır, sunucu adayları yükler. */
export function IssueFilters({
  mode,
  year,
  years,
  recipients,
  recipientParam,
  selectedRecipientId,
  batchContent,
}: {
  mode: IssueMode;
  year: number;
  years: number[];
  recipients: Recipient[];
  recipientParam: "bagisci" | "uye" | null;
  selectedRecipientId: string | null;
  batchContent: "bagis" | "aidat";
}) {
  const t = useTranslations("donations.confirmations.issue");
  const setParams = useParamSetter();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <NativeSelect
        id="issue-year"
        label={t("year")}
        className="w-32"
        value={String(year)}
        onChange={(value) => setParams({ yil: value, bagisci: null, uye: null })}
      >
        {years.map((value) => (
          <option key={value} value={String(value)}>
            {value}
          </option>
        ))}
      </NativeSelect>

      {mode === "yillik" ? (
        <NativeSelect
          id="issue-content"
          label={t("batchContent")}
          className="w-48"
          value={batchContent}
          onChange={(value) => setParams({ icerik: value })}
        >
          <option value="bagis">{t("contentDonation")}</option>
          <option value="aidat">{t("contentFee")}</option>
        </NativeSelect>
      ) : null}

      {recipientParam ? (
        <NativeSelect
          id="issue-recipient"
          label={recipientParam === "bagisci" ? t("donor") : t("member")}
          className="min-w-72 flex-1 sm:max-w-md"
          disabled={recipients.length === 0}
          value={selectedRecipientId ?? ""}
          onChange={(value) => setParams({ [recipientParam]: value || null })}
        >
          <option value="">{recipientParam === "bagisci" ? t("selectDonor") : t("selectMember")}</option>
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>
              {recipient.label}
            </option>
          ))}
        </NativeSelect>
      ) : null}
    </div>
  );
}

/** Başarılı üretim sonrası: bildirim bağlantısı ve PDF indirme. */
function IssuedPanel({ id, number }: { id: string; number: string }) {
  const t = useTranslations("donations.confirmations.issue");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-medium border border-success-200 bg-success-50 p-4 text-small dark:bg-success-500/10">
      <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
      <span className="font-semibold text-success-700">
        {t("issuedTitle")}: {number}
      </span>
      <Link href={`/bagislar/bildirimler/${id}`} className="text-primary underline">
        {t("openConfirmation")}
      </Link>
      <a
        href={`/api/donations/confirmations/${id}/pdf`}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-1 text-primary underline"
      >
        <FileDown className="h-4 w-4" aria-hidden />
        {t("downloadPdf")}
      </a>
    </div>
  );
}

/** Toplam + Almanca yazıyla (PDF'teki "in Buchstaben" satırıyla aynı). */
function TotalLine({ cents }: { cents: number }) {
  const t = useTranslations("donations.confirmations.issue");
  return (
    <div className="flex flex-col gap-0.5 rounded-medium bg-default-50 px-3 py-2 text-small">
      <span>
        {t("selectedTotal")}: <strong>{formatMoney(cents)}</strong>
      </span>
      {cents > 0 ? (
        <span className="text-default-500">
          {t("words")}: <em>{amountToGermanWords(cents)}</em>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Bağış adayları (§ 15 md. 6 candidate-picker): tek bağışta radyo, toplu bildirimde
 * onay kutusu. Grup kuralı: Aufwandsspende olan ve olmayan bağışlar ayrı gruptur;
 * bir gruptan seçim yapılınca diğer grubun seçimi temizlenir.
 */
export function DonationCandidatePicker({
  mode,
  donorId,
  year,
  candidates,
  canIssue,
}: {
  mode: "tek" | "toplu";
  donorId: string;
  year: number;
  candidates: IssueCandidateRow[];
  canIssue: boolean;
}) {
  const t = useTranslations("donations.confirmations.issue");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ id: string; number: string } | null>(null);
  const router = useRouter();

  if (issued) return <IssuedPanel id={issued.id} number={issued.number} />;
  if (candidates.length === 0) {
    return <p className="text-small text-default-500">{t("candidatesEmpty")}</p>;
  }

  const byId = new Map(candidates.map((candidate) => [candidate.sourceId, candidate]));
  const total = selected.reduce((sum, id) => sum + (byId.get(id)?.amountCents ?? 0), 0);

  const toggle = (id: string, on: boolean) => {
    const group = byId.get(id)?.waived;
    setSelected((current) =>
      on
        ? [...current.filter((other) => byId.get(other)?.waived === group), id]
        : current.filter((other) => other !== id),
    );
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result =
        mode === "tek"
          ? await issueConfirmationAction({ kind: "SINGLE", content: "DONATION", donationId: selected[0] })
          : await issueConfirmationAction({
              kind: "COLLECTIVE",
              content: "DONATION",
              donorId,
              periodFrom: `${year}-01-01`,
              periodTo: `${year}-12-31`,
              donationIds: selected,
            });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastIssued", { number: result.data.confirmationNumber }), color: "success" });
      setIssued({ id: result.data.id, number: result.data.confirmationNumber });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const groups = [
    { waived: false, title: t("groupNotWaived") },
    { waived: true, title: t("groupWaived") },
  ].filter((group) => candidates.some((candidate) => candidate.waived === group.waived));

  const row = (candidate: IssueCandidateRow) => (
    <span className="flex flex-1 flex-wrap items-center justify-between gap-x-4 text-small">
      <span className="font-medium">{candidate.sourceNumber}</span>
      <span className="text-default-500">{formatDate(new Date(candidate.itemDate))}</span>
      <span className="font-semibold">{formatMoney(candidate.amountCents)}</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      {mode === "tek" ? (
        <RadioGroup
          aria-label={t("step2")}
          value={selected[0] ?? ""}
          onValueChange={(value) => setSelected(value ? [value] : [])}
        >
          {candidates.map((candidate) => (
            <Radio key={candidate.sourceId} value={candidate.sourceId} classNames={{ base: "max-w-none", labelWrapper: "flex-1" }}>
              {row(candidate)}
            </Radio>
          ))}
        </RadioGroup>
      ) : (
        <>
          {groups.length > 1 ? <p className="text-tiny text-default-500">{t("groupRule")}</p> : null}
          {groups.map((group) => {
            const members = candidates.filter((candidate) => candidate.waived === group.waived);
            return (
              <fieldset key={String(group.waived)} className="flex flex-col gap-2 rounded-medium border border-default-200 p-3">
                <legend className="px-1 text-small font-semibold">{group.title}</legend>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => setSelected(members.map((candidate) => candidate.sourceId))}
                  >
                    {t("selectAll")}
                  </Button>
                  <Button size="sm" variant="light" onPress={() => setSelected([])}>
                    {t("clearAll")}
                  </Button>
                </div>
                {members.map((candidate) => (
                  <Checkbox
                    key={candidate.sourceId}
                    isSelected={selected.includes(candidate.sourceId)}
                    onValueChange={(on) => toggle(candidate.sourceId, on)}
                    classNames={{ base: "max-w-none", label: "flex-1" }}
                  >
                    {row(candidate)}
                  </Checkbox>
                ))}
              </fieldset>
            );
          })}
        </>
      )}

      <TotalLine cents={total} />
      <div>
        <Button color="primary" isDisabled={!canIssue || selected.length === 0} isLoading={busy} onPress={submit}>
          {t("issue")}
        </Button>
      </div>
    </div>
  );
}

/** Aidat bildirimi: o yılın henüz bildirilmemiş tüm ödemeleri tek bildirimde (servis kuralı). */
export function FeeCandidateList({
  memberId,
  year,
  candidates,
  canIssue,
}: {
  memberId: string;
  year: number;
  candidates: IssueCandidateRow[];
  canIssue: boolean;
}) {
  const t = useTranslations("donations.confirmations.issue");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ id: string; number: string } | null>(null);
  const router = useRouter();

  if (issued) return <IssuedPanel id={issued.id} number={issued.number} />;
  if (candidates.length === 0) {
    return <p className="text-small text-default-500">{t("candidatesEmpty")}</p>;
  }
  const total = candidates.reduce((sum, candidate) => sum + candidate.amountCents, 0);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await issueConfirmationAction({ kind: "SINGLE", content: "MEMBERSHIP_FEE", memberId, year });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastIssued", { number: result.data.confirmationNumber }), color: "success" });
      setIssued({ id: result.data.id, number: result.data.confirmationNumber });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-tiny text-default-500">{t("feeAllIncluded")}</p>
      <ul className="flex flex-col divide-y divide-default-100 rounded-medium border border-default-200">
        {candidates.map((candidate) => (
          <li key={candidate.sourceId} className="flex items-center justify-between gap-4 px-3 py-2 text-small">
            <span className="font-medium">{candidate.sourceNumber}</span>
            <span className="text-default-500">{formatDate(new Date(candidate.itemDate))}</span>
            <span className="font-semibold">{formatMoney(candidate.amountCents)}</span>
          </li>
        ))}
      </ul>
      <TotalLine cents={total} />
      <div>
        <Button color="primary" isDisabled={!canIssue} isLoading={busy} onPress={submit}>
          {t("issue")}
        </Button>
      </div>
    </div>
  );
}

/** Yıllık toplu üretim (§ 11 md. 9 md. 4): alıcı başına bir bildirim; sonuçlar tek tek listelenir. */
export function BatchIssuePanel({
  content,
  year,
  recipients,
  canIssue,
}: {
  content: "DONATION" | "MEMBERSHIP_FEE";
  year: number;
  recipients: Recipient[];
  canIssue: boolean;
}) {
  const t = useTranslations("donations.confirmations.issue");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(recipients.map((recipient) => recipient.id));
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);

  if (recipients.length === 0) {
    return <p className="text-small text-default-500">{t("noRecipients")}</p>;
  }
  const labelOf = new Map(recipients.map((recipient) => [recipient.id, recipient.label]));

  const run = async () => {
    setBusy(true);
    try {
      const result = await issueBatchAction({ year, content, recipientIds: selected });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      const ok = result.data.filter((row) => row.ok).length;
      addToast({
        title: t("batchResult", { ok, failed: result.data.length - ok }),
        color: ok === result.data.length ? "success" : "warning",
      });
      setResults(result.data);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (results) {
    return (
      <ul className="flex flex-col divide-y divide-default-100 rounded-medium border border-default-200">
        {results.map((row) => (
          <li key={row.recipientId} className="flex items-start gap-2 px-3 py-2 text-small">
            {row.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            )}
            <span className="flex-1 font-medium">{labelOf.get(row.recipientId) ?? row.recipientId}</span>
            <span className={row.ok ? "text-success-700" : "text-danger"}>
              {row.ok
                ? t("resultOk", { number: row.confirmationNumber ?? "" })
                : t("resultFailed", { error: row.error ?? "" })}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="light" onPress={() => setSelected(recipients.map((recipient) => recipient.id))}>
          {t("selectAll")}
        </Button>
        <Button size="sm" variant="light" onPress={() => setSelected([])}>
          {t("clearAll")}
        </Button>
        <span className="text-tiny text-default-500">{t("batchSelected", { count: selected.length })}</span>
      </div>
      <div className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-medium border border-default-200 p-3">
        {recipients.map((recipient) => (
          <Checkbox
            key={recipient.id}
            isSelected={selected.includes(recipient.id)}
            onValueChange={(on) =>
              setSelected((current) =>
                on ? [...current, recipient.id] : current.filter((id) => id !== recipient.id),
              )
            }
          >
            <span className="text-small">{recipient.label}</span>
          </Checkbox>
        ))}
      </div>
      <div>
        <Button color="primary" isDisabled={!canIssue || selected.length === 0} isLoading={busy} onPress={run}>
          {t("batchRun")}
        </Button>
      </div>
    </div>
  );
}
