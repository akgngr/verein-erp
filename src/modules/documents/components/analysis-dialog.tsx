"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Chip,
  Button,
  Spinner,
  Modal,
  Checkbox,
  Label,
} from "@heroui/react";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import type { DocumentAnalysis } from "../services/document-analysis";

/** Forma uygulanabilir alanlar (tutar ve IBAN bilgi amaçlıdır; EV-3'te muhasebeye aktarılacak). */
export const APPLICABLE_FIELDS = [
  "counterparty",
  "documentDate",
  "referenceNumber",
  "subject",
  "dueDate",
  "summary",
  "categoryId",
] as const;
export type ApplicableField = (typeof APPLICABLE_FIELDS)[number];

const euro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (iso: string) => iso.split("-").reverse().join(".");

/** Analiz sonucundan forma girilecek değerler (özet: tür + tutar + termin; kullanıcı düzenleyebilir). */
export function analysisValues(
  analysis: DocumentAnalysis,
  t: (key: string, values?: Record<string, string>) => string,
): Partial<Record<ApplicableField, string>> {
  const s = analysis.suggestions;
  const summaryParts = [
    s.kind ? t(`kinds.${s.kind}`) : null,
    s.amountCents ? t("summaryAmount", { amount: euro(s.amountCents) }) : null,
    s.dueDate ? t("summaryDue", { date: day(s.dueDate) }) : null,
    s.iban ? t("summaryIban", { iban: s.iban }) : null,
  ].filter(Boolean);
  return {
    counterparty: s.counterparty,
    documentDate: s.documentDate,
    referenceNumber: s.referenceNumber,
    subject: s.subject,
    dueDate: s.dueDate,
    summary: summaryParts.length ? summaryParts.join(" · ") : undefined,
  };
}

/** AI özeti (EV-2): /api/ai/document-summary yanıtı. */
type AiSummary = {
  summary: string;
  kind: string;
  category: string | null;
  actionRequired: boolean;
  processing: "local" | "cloud";
};

/**
 * "Evraktan doldur" öneri penceresi: bulunan değerler mevcut form değerleriyle yan yana gösterilir;
 * yalnız işaretlenen alanlar forma yazılır (kayıt yine normal form doğrulamasıyla yapılır).
 */
export function AnalysisDialog({
  analysis,
  current,
  labels,
  categories,
  aiAvailable,
  onApply,
  onClose,
}: {
  analysis: DocumentAnalysis;
  current: Record<ApplicableField, string>;
  labels: Record<ApplicableField, string>;
  categories: Array<{ id: string; label: string }>;
  aiAvailable: boolean;
  onApply: (values: Partial<Record<ApplicableField, string>>) => void;
  onClose: () => void;
}) {
  const t = useTranslations("documents.analyze");
  const locale = useLocale();
  const [ai, setAi] = useState<AiSummary | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const base = analysisValues(analysis, (key, params) =>
    t(key as never, params as never),
  );
  const categoryId = ai?.category
    ? categories.find((category) => category.label === ai.category)?.id
    : undefined;
  // AI özeti varsa kural tabanlı bilgiler (tutar, termin, IBAN) özetin sonuna eklenir.
  const values: Partial<Record<ApplicableField, string>> = ai
    ? {
        ...base,
        summary: [ai.summary, base.summary].filter(Boolean).join("\n"),
        categoryId,
      }
    : base;
  const found = APPLICABLE_FIELDS.filter((field) => values[field]);
  // Varsayılan: boş alanlar ve farklı değerler seçili; aynı değer seçili değil.
  const [selected, setSelected] = useState<string[]>(
    found.filter((field) => values[field] !== current[field]),
  );
  const categoryLabel = (id: string | undefined) =>
    categories.find((category) => category.id === id)?.label;
  const show = (field: ApplicableField, value: string | undefined) =>
    field === "categoryId"
      ? (categoryLabel(value) ?? "—")
      : value && (field === "documentDate" || field === "dueDate")
        ? day(value)
        : value || "—";

  /** AI özeti: evrak metni (önizleme) AI modülüne gider; bulutta maskelenir, politika sunucuda uygulanır. */
  const summarize = async () => {
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai/document-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: analysis.preview,
          locale: locale === "de" ? "de" : "tr",
          categories: categories.map((category) => category.label),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok: boolean;
        summary?: AiSummary;
        error?: string;
      } | null;
      if (!result?.ok || !result.summary)
        return void toast(result?.error ?? t("aiFailed"), {
          variant: "danger",
        });
      setAi(result.summary);
      setSelected((list) => [
        ...new Set([
          ...list,
          "summary",
          ...(result.summary!.category ? ["categoryId"] : []),
        ]),
      ]);
    } catch {
      toast(t("aiFailed"), { variant: "danger" });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll={"inside"}>
          <Modal.Dialog className={"w-full max-w-2xl "}>
            <DialogDismissButton />

            <Modal.Header className="flex flex-col gap-1">
              <Modal.Heading className="flex items-center gap-2">
                {t("title")}
              </Modal.Heading>
              <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-ink-500">
                <Chip
                  size="sm"
                  color={statusTone(
                    analysis.source === "ocr" ? "warning" : "success",
                  )}
                  variant={"soft"}
                  style={statusStyle(
                    analysis.source === "ocr" ? "warning" : "success",
                  )}
                >
                  {t(`source.${analysis.source}`)}
                </Chip>
                {analysis.confidence !== null
                  ? t("confidence", { value: String(analysis.confidence) })
                  : null}
              </span>
            </Modal.Header>
            <Modal.Body>
              {found.length === 0 ? (
                <p className="text-sm text-ink-500">
                  {analysis.source === "none" ? t("noText") : t("nothingFound")}
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-500">{t("hint")}</p>
                  <ul className="flex flex-col gap-2">
                    {found.map((field) => (
                      <li
                        key={field}
                        className="rounded-lg border border-ink-200 p-3"
                      >
                        <Checkbox
                          isSelected={selected.includes(field)}
                          onChange={(on) =>
                            setSelected((list) =>
                              on
                                ? [...list, field]
                                : list.filter((item) => item !== field),
                            )
                          }
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Label>
                              <span className="text-sm font-medium">
                                {labels[field]}
                              </span>
                            </Label>
                          </Checkbox.Content>
                        </Checkbox>
                        <div className="mt-1 grid grid-cols-1 gap-1 pl-7 text-sm sm:grid-cols-2">
                          <span className="text-ink-400 line-through decoration-ink-300">
                            {show(field, current[field])}
                          </span>
                          <span className="font-medium text-foreground">
                            {show(field, values[field])}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {analysis.suggestions.amountCents ||
                  analysis.suggestions.iban ? (
                    <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
                      {t("paymentHint")}
                    </p>
                  ) : null}
                </>
              )}
              {analysis.preview && aiAvailable ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 p-3">
                  {ai ? (
                    <>
                      <Chip
                        size="sm"
                        color={"accent"}
                        variant={"soft"}
                        style={statusStyle("secondary")}
                      >
                        {t(`aiKinds.${ai.kind}`)}
                      </Chip>
                      {ai.actionRequired ? (
                        <Chip size="sm" color={"warning"} variant={"soft"}>
                          {t("aiActionRequired")}
                        </Chip>
                      ) : null}
                      <span className="text-xs text-ink-500">
                        {t(`aiProcessing.${ai.processing}`)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onPress={summarize}
                        variant={actionVariant("secondary", "flat")}
                        isPending={aiBusy}
                      >
                        {aiBusy ? <Spinner size="sm" color="current" /> : null}
                        {aiBusy ? null : (
                          <Sparkles className="h-4 w-4" aria-hidden />
                        )}
                        {t("aiSummarize")}
                      </Button>
                      <span className="text-xs text-ink-500">
                        {t("aiHint")}
                      </span>
                    </>
                  )}
                </div>
              ) : null}
              {analysis.preview ? (
                <details className="text-xs text-ink-500">
                  <summary className="cursor-pointer">{t("showText")}</summary>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-100 p-3 font-sans">
                    {analysis.preview}
                  </pre>
                </details>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button
                onPress={onClose}
                variant={actionVariant("default", "light")}
              >
                {t("cancel")}
              </Button>
              <Button
                isDisabled={!selected.length}
                onPress={() => {
                  onApply(
                    Object.fromEntries(
                      selected.map((field) => [
                        field,
                        values[field as ApplicableField],
                      ]),
                    ),
                  );
                  onClose();
                }}
                variant={actionVariant("primary", "solid")}
              >
                {t("apply", { count: String(selected.length) })}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
