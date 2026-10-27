import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDateTime, formatDate } from "@/shared/utils";

import { memberPaymentsPermissions, membersPermissions } from "../permissions";
import { getMember } from "../queries/get-member";
import { listMemberPayments } from "../queries/list-payments";
import { MemberDetailActions } from "../components/member-detail-actions";
import { NotesTimeline } from "../components/notes-timeline";
import { PaymentsPanel } from "../components/payments-panel";
import { StatusBadge } from "../components/status-badge";
import { TypeBadge } from "../components/type-badge";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="text-small text-foreground">{children}</span>
    </div>
  );
}

/** Üye detayı: bilgi kartı, işlem notları, durum değiştirme menüsü. */
export async function MemberDetailView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(membersPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const member = await getMember(id, user.role);
  if (!member) notFound();
  const t = await getTranslations("members");

  // Aidat ödemeleri (Faz 4, 4.6): panel için ayrı izinler (memberPayments).
  const [payments] = await Promise.all([
    listMemberPayments(member.id),
  ]);
  const canCreatePayment = can(user.role, memberPaymentsPermissions, "create");
  const canVoidPayment = can(user.role, memberPaymentsPermissions, "delete");

  const canUpdate = can(user.role, membersPermissions, "update");
  const canDelete = can(user.role, membersPermissions, "delete");

  return (
    <div>
      <PageHeader
        title={member.membershipNumber}
        description={`${member.firstName} ${member.lastName}`}
        actions={
          <MemberDetailActions
            memberId={member.id}
            membershipNumber={member.membershipNumber}
            status={member.status}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bilgi kartı */}
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TypeBadge type={member.type} />
            <StatusBadge status={member.status} />
            <span className="text-tiny text-default-400">{member.membershipNumber}</span>
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label={t("detail.firstName")}>{member.firstName}</InfoRow>
            <InfoRow label={t("detail.lastName")}>{member.lastName}</InfoRow>
            <InfoRow label={t("detail.type")}>{t(`type.${member.type}`)}</InfoRow>
            <InfoRow label={t("detail.status")}>{t(`status.${member.status}`)}</InfoRow>
            <InfoRow label={t("detail.kimlikNo")}>
              {member.kimlikNo ?? (
                <span className="text-default-400">—</span>
              )}
            </InfoRow>
            <InfoRow label={t("detail.birthDate")}>
              {member.birthDate ? formatDate(member.birthDate) : "-"}
            </InfoRow>
            <InfoRow label={t("detail.email")}>{member.email ?? "-"}</InfoRow>
            <InfoRow label={t("detail.phone")}>{member.phone ?? "-"}</InfoRow>
            <InfoRow label={t("detail.profession")}>{member.profession ?? "-"}</InfoRow>
            <InfoRow label={t("detail.joinDate")}>{formatDate(member.joinDate)}</InfoRow>
            <InfoRow label={t("detail.exitDate")}>
              {member.exitDate ? formatDate(member.exitDate) : "-"}
            </InfoRow>
            <InfoRow label={t("detail.exitReason")}>{member.exitReason ?? "-"}</InfoRow>
            <InfoRow label={t("detail.fieldCancellationReceivedAt")}>
              {member.cancellationReceivedAt ? formatDate(member.cancellationReceivedAt) : "-"}
            </InfoRow>
            <InfoRow label={t("detail.fieldCountry")}>{member.country ?? "-"}</InfoRow>
            <InfoRow label={t("detail.address")}>
              {member.addressFormatted ? (
                <span className="whitespace-pre-wrap">{member.addressFormatted}</span>
              ) : (
                "-"
              )}
            </InfoRow>
            <InfoRow label={t("detail.createdBy")}>
              {`${member.createdByLabel} — ${formatDateTime(member.createdAt)}`}
            </InfoRow>
            <InfoRow label={t("detail.updatedBy")}>
              {member.updatedByLabel
                ? `${member.updatedByLabel} — ${formatDateTime(member.updatedAt)}`
                : "-"}
            </InfoRow>
          </div>

          {member.notes ? (
            <div className="mt-4">
              <span className="text-tiny font-medium uppercase tracking-wide text-default-400">
                {t("detail.notesTitle")}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-small text-foreground">
                {member.notes}
              </p>
            </div>
          ) : null}
        </div>

        {/* İşlem notları */}
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-default-500">
            {t("detail.notesTimelineTitle")}
          </h2>
          <NotesTimeline
            memberId={member.id}
            notes={member.memberNotes}
            canUpdate={canUpdate}
          />
        </div>

        {/* Aidat ödemeleri (Faz 4, 4.6) */}
        <div className="lg:col-span-3">
          <PaymentsPanel
            memberId={member.id}
            payments={payments}
            canCreate={canCreatePayment}
            canDelete={canVoidPayment}
          />
        </div>
      </div>
    </div>
  );
}
