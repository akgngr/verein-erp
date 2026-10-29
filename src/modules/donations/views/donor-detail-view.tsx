import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatDate } from "@/shared/utils";
import { can } from "@/shared/permissions/define";

import { getDonor } from "../queries/get-donor";
import { listDonations } from "../queries/list-donations";
import { donationsPermissions } from "../permissions";

import { AnonymizeDonorDialog } from "../components/anonymize-donor-dialog";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="text-small text-foreground">{children}</span>
    </div>
  );
}

/** Bağışçı detayı (§ 15 md. 4): bağışlar + bildirimler + anonimleştirme. */
export async function DonorDetailView({ id }: { id: string }) {
  const tMethod = await getTranslations("donations.form.method");
  const tD = await getTranslations("donations.common");
  let user;
  try {
    user = await requirePermission(donationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const donor = await getDonor(id);
  if (!donor) notFound();

  const donationList = await listDonations({
    page: 1,
    pageSize: 50 as const,
    q: "",
    sort: "receivedAt",
    dir: "desc" as const,
    filters: {},
    skip: 0,
    take: 50,
  }).then((all) => ({ rows: all.rows.filter((row) => row.donorId === id) }));

  const t = await getTranslations("donations.donors");
  const tList = await getTranslations("donations.list");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });
  const canDelete = can(user.role, donationsPermissions, "delete");

  return (
    <div>
      <PageHeader
        title={`SP-${String(donor.donorNumber).padStart(4, "0")}`}
        description={`${donor.displayName} — ${format(donor.totalCents)}`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {donor.isAnonymized ? (
              <span className="rounded-small bg-default-100 px-2 py-0.5 text-tiny font-semibold text-default-500">
                {t("detail.anonymizedMark")}
              </span>
            ) : null}
            <span className="text-tiny text-default-400">
              {donor.isActive ? tD("active") : tD("passive")} · {formatDate(donor.createdAt)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label={t("form.type")}>
              {donor.type === "ORGANIZATION" ? t("form.typeORGANIZATION") : t("form.typePERSON")}
            </InfoRow>
            <InfoRow label={t("columns.name")}>{donor.displayName}</InfoRow>
            <InfoRow label={t("form.street")}>{donor.street ?? "—"}</InfoRow>
            <InfoRow label={t("form.postalCode")}>{donor.postalCode ?? "—"}</InfoRow>
            <InfoRow label={t("form.city")}>{donor.city ?? "—"}</InfoRow>
            <InfoRow label={t("form.country")}>{donor.country ?? "—"}</InfoRow>
            <InfoRow label={t("form.email")}>{donor.email ?? "—"}</InfoRow>
            <InfoRow label={t("form.phone")}>{donor.phone ?? "—"}</InfoRow>
            <InfoRow label={t("form.note")}>{donor.note ?? "—"}</InfoRow>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
            <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-default-500">
              {tList("title")}
            </h2>
            {donationList.rows.length === 0 ? (
              <p className="text-small text-default-400">{tList("empty")}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-small">
                {donationList.rows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between border-b border-default-100 py-1.5 last:border-none">
                    <Link href={`/bagislar/${row.id}`} className="font-medium text-primary underline">
                      {row.donationNumber}
                    </Link>
                    <span className="text-default-500">
                      {row.receivedAt instanceof Date ? row.receivedAt.toISOString().slice(0, 10) : ""} · {tMethod(row.method)}
                    </span>
                    <span className={row.reversedAt ? "text-default-400 line-through" : "font-medium"}>
                      {format(row.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canDelete && !donor.isAnonymized ? (
            <AnonymizeDonorDialog
              donorId={donor.id}
              donorNumber={`SP-${String(donor.donorNumber).padStart(4, "0")}`}
              retentionBlocked={donor.retentionBlocked}
              labels={{
                button: t("detail.anonymize"),
                title: t("detail.anonymizeTitle"),
                hint: t("detail.anonymizeHint"),
                confirmLabel: t("detail.anonymizeConfirm"),
                toast: t("detail.toastAnonymized"),
              }}
            />
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <Link href="/bagislar/bagiscilar" className="text-small text-primary underline">
          ← {t("title")}
        </Link>
      </div>
    </div>
  );
}
