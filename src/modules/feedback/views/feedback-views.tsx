import { Bug, Lightbulb } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { FeedbackAdminForm } from "../components/feedback-admin-form";
import { feedbackPermissions } from "../permissions";
import { getFeedback, listFeedback } from "../queries/feedback";

const STATUSES = ["NEW", "IN_PROGRESS", "DONE", "REJECTED"] as const;
const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-warning-100 text-warning-800",
  IN_PROGRESS: "bg-brand-100 text-brand-800",
  DONE: "bg-success-100 text-success-800",
  REJECTED: "bg-ink-200 text-ink-700",
};
const when = (date: Date) => date.toISOString().slice(0, 16).replace("T", " ");

async function guard() {
  try {
    return await requirePermission(feedbackPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
}

/** Liste: yönetici tüm kayıtlar (durum filtresi), diğerleri kendi kayıtları ve cevaplar. */
export async function FeedbackListView({
  status,
  type,
}: {
  status: (typeof STATUSES)[number] | null;
  type: "BUG" | "SUGGESTION" | null;
}) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("feedback");
  const all = can(user.role, feedbackPermissions, "approve");
  const { items, counts } = await listFeedback({
    userId: user.id,
    all,
    status: status ?? undefined,
    type: type ?? undefined,
  });
  const href = (
    next: Partial<{ status: string | null; type: string | null }>,
  ) => {
    const params = new URLSearchParams();
    const s = next.status === undefined ? status : next.status;
    const ty = next.type === undefined ? type : next.type;
    if (s) params.set("durum", s);
    if (ty) params.set("tur", ty);
    const query = params.toString();
    return `/geri-bildirim${query ? `?${query}` : ""}`;
  };
  const pill = (active: boolean) =>
    `rounded-lg px-3 py-1.5 ${active ? "bg-accent text-white" : "border border-ink-200"}`;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={all ? t("titleAll") : t("titleMine")}
        description={all ? t("descriptionAll") : t("descriptionMine")}
      />
      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href={href({ status: null })} className={pill(status === null)}>
          {t("status.ALL")}
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={href({ status: value })}
            className={pill(status === value)}
          >{`${t(`status.${value}`)} (${counts[value]})`}</Link>
        ))}
        <span className="mx-1 border-l border-ink-200" />
        <Link
          href={href({ type: type === "BUG" ? null : "BUG" })}
          className={pill(type === "BUG")}
        >
          {t("type.BUG")}
        </Link>
        <Link
          href={href({ type: type === "SUGGESTION" ? null : "SUGGESTION" })}
          className={pill(type === "SUGGESTION")}
        >
          {t("type.SUGGESTION")}
        </Link>
      </nav>
      {items.length ? (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/geri-bildirim/${item.id}`}
                className="flex flex-wrap items-center gap-3 p-3 hover:bg-ink-50"
              >
                {item.type === "BUG" ? (
                  <Bug
                    className="h-4 w-4 text-danger"
                    aria-label={t("type.BUG")}
                  />
                ) : (
                  <Lightbulb
                    className="h-4 w-4 text-accent"
                    aria-label={t("type.SUGGESTION")}
                  />
                )}
                <span className="font-mono text-xs text-ink-500">
                  #{item.number}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {item.title}
                </span>
                {item.priority === "HIGH" ? (
                  <span className="rounded-md bg-danger-100 px-1.5 py-0.5 text-xs text-danger-800">
                    {t("priority.HIGH")}
                  </span>
                ) : null}
                {item.adminReply ? (
                  <span className="text-xs text-success-700">
                    {t("replied")}
                  </span>
                ) : null}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs ${STATUS_COLOR[item.status]}`}
                >
                  {t(`status.${item.status}`)}
                </span>
                <span className="text-xs text-ink-400">
                  {all ? `${item.reporterLabel} · ` : ""}
                  {when(item.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">
          {t("empty")}
        </p>
      )}
    </div>
  );
}

export async function FeedbackDetailView({ id }: { id: string }) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("feedback");
  const all = can(user.role, feedbackPermissions, "approve");
  const item = await getFeedback(id, { userId: user.id, all });
  if (!item) notFound();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`#${item.number} · ${item.title}`}
        description={`${t(`type.${item.type}`)} · ${t(`status.${item.status}`)} · ${when(item.createdAt)}`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-surface p-5 shadow-sm lg:col-span-2">
          <p className="whitespace-pre-wrap text-sm">{item.description}</p>
          {item.adminReply ? (
            <div className="rounded-lg bg-success-50 p-3 text-sm">
              <p className="mb-1 text-xs font-semibold text-success-800">
                {t("replyFrom", {
                  label: item.repliedByLabel ?? "",
                  date: item.repliedAt ? when(item.repliedAt) : "",
                })}
              </p>
              <p className="whitespace-pre-wrap">{item.adminReply}</p>
            </div>
          ) : null}
          {all ? (
            <FeedbackAdminForm
              item={{
                id: item.id,
                status: item.status,
                priority: item.priority,
                adminReply: item.adminReply,
              }}
            />
          ) : null}
        </section>
        <section className="flex flex-col gap-2 rounded-lg border border-ink-200 bg-surface p-5 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase text-ink-500">
            {t("contextTitle")}
          </h2>
          <p>
            {t("fields.reporter")}: {item.reporterLabel}
          </p>
          <p className="break-all">
            {t("fields.page")}:{" "}
            {item.pageUrl && /^\/(?!\/)[^\\\r\n\u0000-\u001f]*$/.test(item.pageUrl) ? (
              <Link className="text-accent hover:underline" href={item.pageUrl}>
                {item.pageUrl}
              </Link>
            ) : (
              item.pageUrl || "—"
            )}
          </p>
          <p>
            {t("fields.viewport")}: {item.viewport ?? "—"}
          </p>
          <p>
            {t("fields.version")}: {item.appVersion ?? "—"}
          </p>
          <p className="break-all text-xs text-ink-500">
            {item.userAgent ?? ""}
          </p>
          {item.screenshotPath && all ? (
            <a
              href={`/api/feedback/${item.id}/screenshot`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- korumalı API yanıtı; next/image optimizasyonu uygulanamaz */}
              <img
                src={`/api/feedback/${item.id}/screenshot`}
                alt={t("fields.screenshot")}
                className="mt-2 rounded-lg border border-ink-200"
              />
            </a>
          ) : null}
        </section>
      </div>
    </div>
  );
}
