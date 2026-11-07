"use client";

import { addToast, Button, Card, CardBody, Chip, Progress } from "@heroui/react";
import { CalendarClock, CheckCircle2, FilePen, Loader2, Mail, MessageCircle, MessageSquare, Plus, Send, Trash2, Workflow, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useHydrated } from "@/shared/hooks/use-hydrated";

import { cancelCampaignAction, deleteCampaignAction } from "../actions/mailing-actions";
import { CampaignWizard, type WizardChannel, type WizardDraft, type WizardSegment, type WizardSource } from "./campaign-wizard";

export type BoardCampaign = {
  id: string;
  name: string;
  subject: string;
  channel: string;
  sourceLabel: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "DONE" | "FAILED" | "CANCELLED";
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedNoEmail: number;
  skippedOptOut: number;
  createdAt: string;
  scheduledAt: string | null;
  workflowId: string | null;
  createdByLabel: string;
  draft: WizardDraft | null;
};

const COLUMNS = [
  { key: "draft", statuses: ["DRAFT"], icon: FilePen },
  { key: "scheduled", statuses: ["SCHEDULED"], icon: CalendarClock },
  { key: "sending", statuses: ["SENDING"], icon: Loader2 },
  { key: "finished", statuses: ["DONE", "FAILED", "CANCELLED"], icon: CheckCircle2 },
] as const;

const STATUS_COLOR = { DRAFT: "default", SCHEDULED: "secondary", SENDING: "primary", DONE: "success", FAILED: "danger", CANCELLED: "warning" } as const;
const CHANNEL_ICON: Record<string, typeof Mail> = { email: Mail, sms: MessageSquare, telegram: Send, whatsapp: MessageCircle };

/** Kampanya panosu: durum sütunları, kart başına kanal, alıcı ve sonuç; yeni kampanya tam ekran sihirbazda. */
export function CampaignBoard(props: {
  campaigns: BoardCampaign[];
  canCreate: boolean;
  sources: WizardSource[];
  segments: WizardSegment[];
  channels: WizardChannel[];
  defaultHtml: string;
  defaultText: string;
  initialSourceId: string | null;
}) {
  const t = useTranslations("mailings");
  const format = useFormatter();
  const router = useRouter();
  const hydrated = useHydrated();
  const [wizard, setWizard] = useState<{ open: boolean; draft: WizardDraft | null; key: number }>({ open: Boolean(props.initialSourceId && props.canCreate), draft: null, key: 0 });
  const [confirm, setConfirm] = useState<{ id: string; kind: "cancel" | "delete" } | null>(null);
  const totals = {
    campaigns: props.campaigns.length,
    sent: props.campaigns.reduce((sum, item) => sum + item.sentCount, 0),
    scheduled: props.campaigns.filter((item) => item.status === "SCHEDULED").length,
  };
  // Gönderim sürerken pano kendini tazeler (worker arka planda çalışır).
  const active = props.campaigns.some((item) => item.status === "SENDING");
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  const date = (iso: string) => (hydrated ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" }) : "");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Chip variant="flat" startContent={<Send className="ms-1 h-3.5 w-3.5" />}>{t("board.totalCampaigns", { count: totals.campaigns })}</Chip>
        <Chip variant="flat" color="success">{t("board.totalSent", { count: totals.sent })}</Chip>
        <Chip variant="flat" color="secondary">{t("board.totalScheduled", { count: totals.scheduled })}</Chip>
        {props.canCreate ? (
          <Button color="primary" className="ms-auto" startContent={<Plus className="h-4 w-4" />} onPress={() => setWizard((current) => ({ open: true, draft: null, key: current.key + 1 }))}>
            {t("board.newCampaign")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = props.campaigns.filter((item) => (column.statuses as readonly string[]).includes(item.status));
          const Icon = column.icon;
          return (
            <section key={column.key} className="flex min-w-0 flex-col gap-3 rounded-large bg-default-50 p-3 dark:bg-default-100/40">
              <h2 className="flex items-center gap-2 text-small font-semibold text-default-700">
                <Icon className="h-4 w-4" />{t(`board.columns.${column.key}`)}
                <span className="ms-auto rounded-full bg-default-200 px-2 text-tiny">{items.length}</span>
              </h2>
              {items.length === 0 ? <p className="py-6 text-center text-tiny text-default-400">{t("board.empty")}</p> : null}
              {items.map((item) => {
                const ChannelIcon = CHANNEL_ICON[item.channel] ?? Send;
                const progress = item.recipientCount ? Math.round(((item.sentCount + item.failedCount) / item.recipientCount) * 100) : 0;
                return (
                  // Kart tıklanabilir değil (içinde düğmeler var; button içinde button geçersiz HTML).
                  <Card key={item.id} shadow="sm">
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <ChannelIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="line-clamp-2 font-medium">{item.name || item.subject}</span>
                        <Chip size="sm" variant="flat" color={STATUS_COLOR[item.status]} className="ms-auto shrink-0">{t(`statusLabels.${item.status}`)}</Chip>
                      </div>
                      <p className="truncate text-tiny text-default-500">{item.sourceLabel}</p>
                      {item.status === "SENDING" || item.status === "DONE" || item.status === "FAILED" ? (
                        <>
                          <Progress size="sm" aria-label={t("board.progress")} value={progress} color={item.failedCount ? "warning" : "success"} />
                          <p className="text-tiny text-default-600">{t("result", { sent: item.sentCount, total: item.recipientCount, failed: item.failedCount })}</p>
                        </>
                      ) : null}
                      <p className="text-tiny text-default-400">
                        {item.status === "SCHEDULED" && item.scheduledAt ? t("board.scheduledFor", { date: date(item.scheduledAt) }) : date(item.createdAt)} · {item.createdByLabel}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {props.canCreate && item.draft ? (
                          <Button size="sm" variant="flat" color="primary" startContent={<FilePen className="h-3.5 w-3.5" />}
                            onPress={() => setWizard((current) => ({ open: true, draft: item.draft, key: current.key + 1 }))}>
                            {t("board.edit")}
                          </Button>
                        ) : null}
                        {item.workflowId ? (
                          <Button as={Link} href={`/automation/workflows/${item.workflowId}`} size="sm" variant="light" startContent={<Workflow className="h-3.5 w-3.5" />}>{t("board.workflow")}</Button>
                        ) : null}
                        {props.canCreate && (item.status === "DRAFT" || item.status === "SCHEDULED") ? (
                          <Button size="sm" variant="light" color="warning" startContent={<XCircle className="h-3.5 w-3.5" />} onPress={() => setConfirm({ id: item.id, kind: "cancel" })}>{t("board.cancel")}</Button>
                        ) : null}
                        {props.canCreate && (item.status === "DRAFT" || item.status === "CANCELLED") ? (
                          <Button size="sm" variant="light" color="danger" startContent={<Trash2 className="h-3.5 w-3.5" />} onPress={() => setConfirm({ id: item.id, kind: "delete" })}>{t("board.delete")}</Button>
                        ) : null}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </section>
          );
        })}
      </div>

      {props.canCreate ? (
        <CampaignWizard key={wizard.key} isOpen={wizard.open} onClose={() => setWizard((current) => ({ ...current, open: false }))}
          sources={props.sources} segments={props.segments} channels={props.channels} defaultHtml={props.defaultHtml} defaultText={props.defaultText}
          draft={wizard.draft} initialSourceId={props.initialSourceId} />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "delete" ? t("board.deleteTitle") : t("board.cancelTitle")}
        message={confirm?.kind === "delete" ? t("board.deleteMessage") : t("board.cancelMessage")}
        onConfirm={async () => {
          if (!confirm) return;
          const response = confirm.kind === "delete" ? await deleteCampaignAction({ id: confirm.id }) : await cancelCampaignAction({ id: confirm.id });
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          setConfirm(null);
          router.refresh();
        }}
      />
    </div>
  );
}
