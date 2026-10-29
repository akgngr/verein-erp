import { getTranslations } from "next-intl/server";
import { FileText, Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { ForbiddenError, listActiveUserOptions, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDate, formatDateTime } from "@/shared/utils";

import { getMeeting } from "../queries/get-meeting";
import { meetingsPermissions } from "../permissions";
import { MEETING_ALLOWED_EXTENSIONS } from "../constants";
import { getEnv } from "@/shared/env";
import { StatusBadge, TypeBadge } from "../components/badges";
import { QuorumBanner } from "../components/quorum-banner";
import { StatusMenu } from "../components/status-menu";
import { AgendaTab } from "../components/agenda-tab";
import { AttendeesTab } from "../components/attendees-tab";
import { DecisionsTab } from "../components/decisions-tab";
import { ActionItemsTab } from "../components/action-items-tab";
import { FilesTab } from "../components/files-tab";
import { DeleteMeetingButton } from "../components/detail-actions";

type TabKey = "genel" | "gundem" | "katilimcilar" | "kararlar" | "gorevler" | "ekler";

/** Sekme anahtar doğrulaması; ?sekme= herhangi bir string olabilir. */
function parseTab(value: string | undefined): TabKey {
  const valid: TabKey[] = ["genel", "gundem", "katilimcilar", "kararlar", "gorevler", "ekler"];
  return valid.includes(value as TabKey) ? (value as TabKey) : "genel";
}

/**
 * Toplantı detayı (7.3): URL ?sekme= ile sunucuda seçilen sekme içeriği;
 * sekmeler sayfa bağlantılarıdır (sunucu render). Eksik/silinmiş toplantı
 * notFound() (5. bölüm md. 5).
 */
export async function MeetingDetailView({
  id,
  tabParam,
  agendaPreset,
}: {
  id: string;
  tabParam?: string;
  agendaPreset?: string;
}) {
  const tStatus = await getTranslations("meetings.status");
  const tType = await getTranslations("meetings.type");
  const tCommon = await getTranslations("common");
  const t = await getTranslations("meetings.detail");
  let user;
  try {
    user = await requirePermission(meetingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const tab = parseTab(tabParam);

  const canUpdate = can(user.role, meetingsPermissions, "update");
  const canApprove = can(user.role, meetingsPermissions, "approve");
  const canDelete = can(user.role, meetingsPermissions, "delete");
  const contentEditable = meeting.status === "PLANNED" || meeting.status === "HELD";
  const canUpload = canUpdate; // files kapsamı: her durumda update yetkisi yeter
  const canDeleteFiles = meeting.status === "APPROVED" ? canDelete : canUpdate;

  const [userOptions, maxUploadMb] = await Promise.all([
    listActiveUserOptions(),
    Promise.resolve(getEnv().MAX_UPLOAD_MB),
  ]);

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "genel", label: t("tabGeneralShort") },
    { key: "gundem", label: t("tabAgendaShort"), badge: meeting.agendaItems.length },
    { key: "katilimcilar", label: t("tabAttendeesShort"), badge: meeting.attendees.length },
    { key: "kararlar", label: t("tabDecisionsShort"), badge: meeting.decisions.length },
    { key: "gorevler", label: t("tabTasksShort"), badge: meeting.actionItems.filter((item) => item.status === "OPEN").length },
    { key: "ekler", label: t("tabFilesShort"), badge: meeting.files.length },
  ];

  const timeText =
    meeting.startTime && meeting.endTime
      ? `${meeting.startTime}–${meeting.endTime}`
      : (meeting.startTime ?? "-");

  return (
    <div>
      <PageHeader
        title={`${meeting.meetingNumber} — ${meeting.title}`}
        description={`${tType(meeting.type)} · ${formatDate(meeting.meetingDate)}${meeting.startTime ? ` · ${timeText}` : ""}${meeting.location ? ` · ${meeting.location}` : ""}`}
        actions={
          <>
            {canUpdate && contentEditable ? (
              <LinkButton
                href={`/toplantilar/${meeting.id}/duzenle`}
                color="default"
                variant="bordered"
                startIcon={<Pencil className="h-4 w-4" />}
              >
                {tCommon("edit")}
              </LinkButton>
            ) : null}
            <StatusMenu
              meetingId={meeting.id}
              meetingNumber={meeting.meetingNumber}
              status={meeting.status}
              canUpdate={canUpdate}
              canApprove={canApprove}
              quorumReached={meeting.quorum.reached}
              quorumRequired={meeting.quorumRequired}
            />
            {/* KARAR: PDF yeni sekmede açılır; LinkButton target desteklemediği
                için (paylaşılan bileşen değişikliği yasak) düz <a> kullanılır. */}
            <a
              href={`/api/meetings/${meeting.id}/minutes-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-small border border-default-300 bg-default-50 px-4 py-1.5 text-small font-medium transition-colors hover:bg-default-100"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Tutanak (PDF)
            </a>
            {canDelete && meeting.status !== "APPROVED" ? (
              <DeleteMeetingButton meetingId={meeting.id} meetingNumber={meeting.meetingNumber} />
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={meeting.status} />
        <TypeBadge type={meeting.type} />
        {meeting.status !== "APPROVED" ? (
          <span className="text-tiny text-default-400">{t("draftNote")}</span>
        ) : (
          <span className="text-tiny text-success-600">
            {t("approvedOn", { date: formatDate(meeting.approvedAt), by: meeting.approvedByLabel ?? "" })}
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-default-200">
        {tabs.map((item) => {
          const isActive = item.key === tab;
          return (
            <a
              key={item.key}
              href={`/toplantilar/${meeting.id}?sekme=${item.key}`}
              className={`-mb-px border-b-2 px-3 py-2 text-small ${
                isActive
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-default-500 hover:text-foreground"
              }`}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 ? (
                <span className="ml-1 text-tiny text-default-400">({item.badge})</span>
              ) : null}
            </a>
          );
        })}
      </div>

      {tab === "genel" ? (
        <div className="flex max-w-3xl flex-col gap-4">
          <QuorumBanner quorum={meeting.quorum} />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <InfoItem label={t("fieldNumber")} value={meeting.meetingNumber} />
            <InfoItem label={t("fieldType")} value={tType(meeting.type)} />
            <InfoItem label={t("fieldStatus")} value={tStatus(meeting.status)} />
            <InfoItem label={t("fieldDate")} value={formatDate(meeting.meetingDate)} />
            <InfoItem label={t("fieldTime")} value={timeText} />
            <InfoItem label={t("fieldLocation")} value={meeting.location ?? "-"} />
            <InfoItem
              label={t("fieldQuorum")}
              value={
                meeting.quorumRequired !== null
                  ? t("quorumValueShort", { required: meeting.quorumRequired, present: meeting.quorum.presentCount })
                  : t("notSpecified")
              }
            />
            <InfoItem label={t("recordedBy")} value={meeting.createdByLabel} />
            <InfoItem label={t("createdAt")} value={formatDateTime(meeting.createdAt)} />
            <InfoItem label={t("updatedAt")} value={formatDateTime(meeting.updatedAt)} />
          </dl>
          {meeting.description ? (
            <div>
              <p className="text-tiny font-medium text-default-500">{t("fieldDescription")}</p>
              <p className="whitespace-pre-wrap text-small">{meeting.description}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "gundem" ? (
        <AgendaTab
          meetingId={meeting.id}
          items={meeting.agendaItems}
          decisions={meeting.decisions}
          editable={contentEditable && canUpdate}
          canDecide={canUpdate}
        />
      ) : null}

      {tab === "katilimcilar" ? (
        <AttendeesTab
          meetingId={meeting.id}
          attendees={meeting.attendees}
          quorum={meeting.quorum}
          userOptions={userOptions}
          editable={contentEditable && canUpdate}
        />
      ) : null}

      {tab === "kararlar" ? (
        <DecisionsTab
          meetingId={meeting.id}
          decisions={meeting.decisions}
          agendaItems={meeting.agendaItems}
          editable={contentEditable && canUpdate}
          presetAgendaItemId={agendaPreset ?? null}
        />
      ) : null}

      {tab === "gorevler" ? (
        <ActionItemsTab
          meetingId={meeting.id}
          actionItems={meeting.actionItems}
          decisions={meeting.decisions.map((decision) => ({
            id: decision.id,
            decisionNumber: decision.decisionNumber,
          }))}
          userOptions={userOptions}
          contentEditable={canUpdate}
        />
      ) : null}

      {tab === "ekler" ? (
        <FilesTab
          meetingId={meeting.id}
          files={meeting.files}
          canUpload={canUpload}
          canDeleteFiles={canDeleteFiles}
          maxMb={maxUploadMb}
          allowedExtensions={MEETING_ALLOWED_EXTENSIONS}
        />
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-tiny text-default-500">{label}</dt>
      <dd className="text-small">{value}</dd>
    </div>
  );
}
