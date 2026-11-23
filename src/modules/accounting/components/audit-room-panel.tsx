"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Plus, ShieldAlert, XCircle } from "lucide-react";

import { Button, Card, Input, Label, StatusChip, TextField } from "@/shared/components/kit";
import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";
import { formatPdfMoney } from "@/shared/pdf/format";

import {
  addAuditFindingAction,
  createAuditRoomAction,
  resolveAuditFindingAction,
  revokeAuditRoomAction,
  toggleAuditChecklistAction,
} from "../actions/audit-room-actions";
import type { AuditRoomOverviewResult } from "../services/audit-room";
import type { AuditFindingSeverityKey, AuditRoomSectionKey } from "../services/audit-room-core";

const ID_PREFIX = "accounting-audit-room";

export function AuditRoomPanel({ overview }: { overview: AuditRoomOverviewResult }) {
  const t = useTranslations("accounting.auditRoom");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Admin: create time-boxed room form
  const [title, setTitle] = useState(`${t("defaultTitle")} ${overview.year}`);
  const [auditorUserId, setAuditorUserId] = useState("");
  const [daysValid, setDaysValid] = useState("14");

  // Finding form
  const [findingSection, setFindingSection] = useState<AuditRoomSectionKey>("BOOKING_SAMPLE");
  const [findingSeverity, setFindingSeverity] = useState<AuditFindingSeverityKey>("NOTE");
  const [findingSummary, setFindingSummary] = useState("");
  const [findingDetail, setFindingDetail] = useState("");

  const activeRoom = overview.activeRoom;
  const guided = overview.guided;

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? t("errors.generic"));
        return;
      }
      onOk?.();
      router.refresh();
    });
  };

  const handleCreateRoom = () => {
    const days = Math.max(1, Math.min(90, Number(daysValid) || 14));
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + days * 86_400_000);
    runAction(() =>
      createAuditRoomAction({
        year: overview.year,
        title: title.trim() || `${t("defaultTitle")} ${overview.year}`,
        auditorUserId: auditorUserId.trim() || null,
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }),
    );
  };

  const handleAddFinding = () => {
    if (!activeRoom || !findingSummary.trim()) return;
    runAction(
      () =>
        addAuditFindingAction({
          roomId: activeRoom.id,
          section: findingSection,
          severity: findingSeverity,
          summary: findingSummary.trim(),
          detail: findingDetail.trim() || null,
        }),
      () => {
        setFindingSummary("");
        setFindingDetail("");
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-ink-500" aria-hidden />
          {activeRoom ? (
            <StatusChip tone={activeRoom.active ? "success" : "danger"}>
              {activeRoom.active
                ? t("statusActive", { date: activeRoom.expiresAt.slice(0, 10) })
                : t("statusExpired")}
            </StatusChip>
          ) : (
            <StatusChip tone="warning">{t("noRoom")}</StatusChip>
          )}
        </div>
        <PdfSplitButton
          buildHref={(lang) => `/api/accounting/extras/auditor-report?year=${overview.year}&lang=${lang}`}
          label={t("pdfButton")}
          aria={t("pdfAria")}
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger-300 bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-950/30 dark:text-danger-200">
          {error}
        </div>
      ) : null}

      {overview.canManage ? (
        <Card>
          <Card.Header>
            <h2 className="text-base font-semibold">{t("manageTitle")}</h2>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <TextField id={`${ID_PREFIX}-title`} value={title} onChange={setTitle}>
                <Label>{t("roomTitleLabel")}</Label>
                <Input />
              </TextField>
              <TextField id={`${ID_PREFIX}-auditor`} value={auditorUserId} onChange={setAuditorUserId}>
                <Label>{t("auditorUserIdLabel")}</Label>
                <Input placeholder={t("auditorUserIdPlaceholder")} />
              </TextField>
              <TextField id={`${ID_PREFIX}-days`} value={daysValid} onChange={setDaysValid}>
                <Label>{t("daysValidLabel")}</Label>
                <Input type="number" min={1} max={90} />
              </TextField>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" isDisabled={isPending} onPress={handleCreateRoom}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("createRoom")}
              </Button>
              {activeRoom?.active ? (
                <Button
                  size="sm"
                  variant="danger-soft"
                  isDisabled={isPending}
                  onPress={() => runAction(() => revokeAuditRoomAction({ roomId: activeRoom.id }))}
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  {t("revokeRoom")}
                </Button>
              ) : null}
            </div>
          </Card.Content>
        </Card>
      ) : null}

      {activeRoom && guided ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeRoom.checklist.map((item) => (
              <Card key={item.section}>
                <Card.Header className="flex flex-row items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{t(`sections.${item.section}`)}</h2>
                  <StatusChip tone={item.checked ? "success" : undefined}>
                    {item.checked ? t("checked") : t("pending")}
                  </StatusChip>
                </Card.Header>
                <Card.Content className="space-y-3 text-sm">
                  {item.section === "BOOKING_SAMPLE" ? (
                    <p>{t("metrics.bookingSample", { count: guided.bookingSample.length })}</p>
                  ) : null}
                  {item.section === "RECEIPT_COMPLETENESS" ? (
                    <p>{t("metrics.receiptCompleteness", { missing: guided.receiptCompleteness.missingCount, gaps: guided.receiptCompleteness.sequenceGapCount })}</p>
                  ) : null}
                  {item.section === "CASH_COUNTS" ? (
                    <p>{t("metrics.cashCounts", { accounts: guided.cashCounts.length, unclosed: guided.cashCounts.reduce((s, c) => s + c.unclosedDays, 0) })}</p>
                  ) : null}
                  {item.section === "BANK_RECONCILIATION" ? (
                    <p>{t("metrics.bankReconciliation", { open: guided.bankReconciliation.openCount, booked: guided.bankReconciliation.bookedCount })}</p>
                  ) : null}
                  {item.section === "OPEN_ITEMS" ? (
                    <p>{t("metrics.openItems", { invoices: guided.openItems.openInvoicesCount, payables: guided.openItems.openPayablesCount })}</p>
                  ) : null}
                  {activeRoom.active ? (
                    <Button
                      size="sm"
                      variant={item.checked ? "secondary" : "primary"}
                      isDisabled={isPending}
                      onPress={() =>
                        runAction(() =>
                          toggleAuditChecklistAction({
                            roomId: activeRoom.id,
                            section: item.section,
                            checked: !item.checked,
                            note: item.note,
                          }),
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      {item.checked ? t("uncheck") : t("markChecked")}
                    </Button>
                  ) : null}
                </Card.Content>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <Card.Header>
                <h2 className="text-base font-semibold">{t("sampleBookingsTitle")}</h2>
              </Card.Header>
              <Card.Content className="space-y-2 text-sm">
                {guided.bookingSample.length === 0 ? (
                  <p className="text-ink-500">{t("emptySample")}</p>
                ) : (
                  <ul className="divide-y divide-ink-200/70">
                    {guided.bookingSample.slice(0, 8).map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.bookingNumber} · {row.description}</p>
                          <p className="text-xs text-ink-500">{row.bookingDate} · {t("filesCount", { count: row.fileCount })}</p>
                        </div>
                        <span className="shrink-0 font-mono text-xs">{formatPdfMoney(row.amountCents, "de")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <h2 className="text-base font-semibold">{t("findingsTitle")}</h2>
              </Card.Header>
              <Card.Content className="space-y-4 text-sm">
                {activeRoom.active ? (
                  <div className="space-y-3 rounded-lg border border-ink-200/80 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-medium">
                        <span>{t("sectionLabel")}</span>
                        <select
                          id={`${ID_PREFIX}-finding-section`}
                          value={findingSection}
                          onChange={(e) => setFindingSection(e.target.value as AuditRoomSectionKey)}
                          className="rounded-lg border border-ink-200 bg-background px-2 py-1.5 text-sm text-foreground"
                        >
                          <option value="BOOKING_SAMPLE">{t("sections.BOOKING_SAMPLE")}</option>
                          <option value="RECEIPT_COMPLETENESS">{t("sections.RECEIPT_COMPLETENESS")}</option>
                          <option value="CASH_COUNTS">{t("sections.CASH_COUNTS")}</option>
                          <option value="BANK_RECONCILIATION">{t("sections.BANK_RECONCILIATION")}</option>
                          <option value="OPEN_ITEMS">{t("sections.OPEN_ITEMS")}</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium">
                        <span>{t("severityLabel")}</span>
                        <select
                          id={`${ID_PREFIX}-finding-severity`}
                          value={findingSeverity}
                          onChange={(e) => setFindingSeverity(e.target.value as AuditFindingSeverityKey)}
                          className="rounded-lg border border-ink-200 bg-background px-2 py-1.5 text-sm text-foreground"
                        >
                          <option value="INFO">{t("severities.INFO")}</option>
                          <option value="NOTE">{t("severities.NOTE")}</option>
                          <option value="ISSUE">{t("severities.ISSUE")}</option>
                        </select>
                      </label>
                    </div>
                    <TextField id={`${ID_PREFIX}-finding-summary`} value={findingSummary} onChange={setFindingSummary}>
                      <Label>{t("summaryLabel")}</Label>
                      <Input />
                    </TextField>
                    <TextField id={`${ID_PREFIX}-finding-detail`} value={findingDetail} onChange={setFindingDetail}>
                      <Label>{t("detailLabel")}</Label>
                      <Input />
                    </TextField>
                    <Button size="sm" variant="primary" isDisabled={isPending || !findingSummary.trim()} onPress={handleAddFinding}>
                      <ShieldAlert className="h-4 w-4" aria-hidden />
                      {t("addFinding")}
                    </Button>
                  </div>
                ) : null}

                {activeRoom.findings.length === 0 ? (
                  <p className="text-ink-500">{t("noFindings")}</p>
                ) : (
                  <ul className="space-y-2">
                    {activeRoom.findings.map((finding) => (
                      <li key={finding.id} className="rounded-lg border border-ink-200/80 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <StatusChip tone={finding.severity === "ISSUE" ? "danger" : finding.severity === "NOTE" ? "warning" : undefined}>
                              {t(`severities.${finding.severity}`)}
                            </StatusChip>
                            <span className="text-xs text-ink-500">{t(`sections.${finding.section}`)}</span>
                          </div>
                          <StatusChip tone={finding.status === "RESOLVED" ? "success" : "warning"}>
                            {t(`statuses.${finding.status}`)}
                          </StatusChip>
                        </div>
                        <p className="mt-1 font-medium">{finding.summary}</p>
                        {finding.detail ? <p className="mt-0.5 text-xs text-ink-500">{finding.detail}</p> : null}
                        {finding.status === "OPEN" && activeRoom.active ? (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              isDisabled={isPending}
                              onPress={() => runAction(() => resolveAuditFindingAction({ findingId: finding.id }))}
                            >
                              {t("resolveFinding")}
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
