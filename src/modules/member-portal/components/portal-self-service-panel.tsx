"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, CardContent, CardHeader, Input, StatusChip } from "@/shared/components/kit";

type CorrectionItem = {
  id: string;
  field: string;
  proposedValue: string;
  status: string;
};

type ConsentItem = {
  target: "bulkMail" | "photo" | "sms" | "whatsapp" | "telegram";
  active: boolean;
  textVersion: string;
  maskedAddress: string | null;
};

type ReceiptItem = {
  ref: string;
  kind: "dues" | "donation";
  number: string;
  year: number;
  amountCents: number;
  voided: boolean;
};

const FIELD_OPTIONS = ["email", "phone", "street", "houseNumber", "postalCode", "city"] as const;

export function PortalSelfServicePanel({
  initialCorrections,
  initialConsents,
  receipts,
  stepUpActive,
}: {
  initialCorrections: CorrectionItem[];
  initialConsents: ConsentItem[];
  receipts: ReceiptItem[];
  stepUpActive: boolean;
}) {
  const t = useTranslations("member-portal");

  const [corrections, setCorrections] = useState(initialCorrections);
  const [field, setField] = useState<(typeof FIELD_OPTIONS)[number]>("email");
  const [proposedValue, setProposedValue] = useState("");
  const [correctionNotice, setCorrectionNotice] = useState<string | null>(null);
  const [correctionPending, setCorrectionPending] = useState(false);

  const [consents, setConsents] = useState(initialConsents);
  const [consentNotice, setConsentNotice] = useState<string | null>(null);
  const [consentPending, setConsentPending] = useState<string | null>(null);

  async function submitCorrection(e: FormEvent) {
    e.preventDefault();
    setCorrectionPending(true);
    setCorrectionNotice(null);
    try {
      const res = await fetch("/api/member-portal/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, proposedValue }),
      });
      if (!res.ok) {
        setCorrectionNotice(t("corrections.errorNotice"));
        return;
      }
      const data = (await res.json()) as { id: string };
      setCorrections((prev) => [
        { id: data.id, field, proposedValue, status: "PENDING" },
        ...prev,
      ]);
      setProposedValue("");
      setCorrectionNotice(t("corrections.submittedNotice"));
    } finally {
      setCorrectionPending(false);
    }
  }

  async function handleConsentAction(
    target: ConsentItem["target"],
    action: "revoke" | "requestOptIn",
  ) {
    setConsentPending(target);
    setConsentNotice(null);
    try {
      const res = await fetch("/api/member-portal/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target }),
      });
      if (!res.ok) return;
      if (action === "revoke") {
        setConsents((prev) =>
          prev.map((item) => (item.target === target ? { ...item, active: false } : item)),
        );
        setConsentNotice(t("consents.revokedNotice"));
      } else {
        setConsentNotice(t("consents.optInSentNotice"));
      }
    } finally {
      setConsentPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("corrections.title")}</h2>
          <p className="text-xs text-ink-500">{t("corrections.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submitCorrection} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
              {t("corrections.fieldLabel")}
              <select
                value={field}
                onChange={(e) => setField(e.target.value as (typeof FIELD_OPTIONS)[number])}
                className="h-9 rounded-lg border border-ink-200 bg-surface px-2 text-sm text-ink-900"
              >
                {FIELD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`shell.fields.${opt}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700 sm:col-span-2">
              {t("corrections.valueLabel")}
              <Input
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
              />
            </label>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" isDisabled={correctionPending || !proposedValue.trim()}>
                {t("corrections.submitButton")}
              </Button>
            </div>
          </form>

          {correctionNotice ? (
            <p className="text-xs text-ink-600" role="status">
              {correctionNotice}
            </p>
          ) : null}

          {corrections.length === 0 ? (
            <p className="text-xs text-ink-500">{t("corrections.empty")}</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {corrections.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <span className="font-medium text-ink-900">
                      {t(`shell.fields.${item.field}`)}:
                    </span>{" "}
                    <span className="text-ink-700">{item.proposedValue}</span>
                  </div>
                  <StatusChip
                    tone={
                      item.status === "APPROVED"
                        ? "success"
                        : item.status === "REJECTED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {t(`corrections.statuses.${item.status}`)}
                  </StatusChip>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("consents.title")}</h2>
          <p className="text-xs text-ink-500">{t("consents.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {consentNotice ? (
            <p className="text-xs text-ink-600" role="status">
              {consentNotice}
            </p>
          ) : null}
          <ul className="divide-y divide-ink-100 text-sm">
            {consents.map((item) => (
              <li key={item.target} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-medium text-ink-900">
                    {t(`consents.targets.${item.target}`)}
                  </div>
                  <div className="text-xs text-ink-500">
                    {t("consents.version", { version: item.textVersion })}
                    {item.maskedAddress ? ` · ${item.maskedAddress}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={item.active ? "success" : "warning"}>
                    {item.active ? t("consents.active") : t("consents.inactive")}
                  </StatusChip>
                  {item.active ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isDisabled={consentPending === item.target}
                      onPress={() => handleConsentAction(item.target, "revoke")}
                    >
                      {t("consents.revokeButton")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isDisabled={consentPending === item.target}
                      onPress={() => handleConsentAction(item.target, "requestOptIn")}
                    >
                      {t("consents.optInButton")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("receipts.title")}</h2>
          <p className="text-xs text-ink-500">{t("receipts.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stepUpActive ? (
            <p className="text-xs text-warning-700">{t("receipts.stepUpHint")}</p>
          ) : null}
          {receipts.length === 0 ? (
            <p className="text-xs text-ink-500">{t("receipts.empty")}</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {receipts.map((item) => (
                <li key={item.ref} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div className="font-medium text-ink-900">
                      {t(`receipts.kinds.${item.kind}`)} · {item.number}
                    </div>
                    <div className="text-xs text-ink-500">
                      {item.year} · {(item.amountCents / 100).toFixed(2)} EUR
                    </div>
                  </div>
                  {stepUpActive ? (
                    <a
                      href={`/api/member-portal/receipts/${encodeURIComponent(item.ref)}`}
                      className="inline-flex h-8 items-center rounded-lg border border-ink-200 px-3 text-xs font-medium text-ink-900 hover:bg-ink-50"
                    >
                      {t("receipts.downloadButton")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
