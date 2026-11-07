import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { CampaignBoard, type BoardCampaign } from "../components/campaign-board";
import type { WizardSource } from "../components/campaign-wizard";
import { mailingsPermissions } from "../permissions";
import { deliveryStats } from "../services/tracking";
import { channelPlaceholderKeys, isMailConfigured, listCampaigns, listChannelInfo, listSegments, listSourcesWithOptions } from "../services/campaigns";

/** Kampanyalar (?kaynak=<modül>:<kaynak> sihirbazı o listeyle açar): pano + tam ekran sihirbaz. */
export async function MailingsView({ sourceId, initialFilter }: { sourceId?: string | null; initialFilter?: Record<string, string[]> }) {
  let user;
  try {
    user = await requirePermission(mailingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, tRoot] = await Promise.all([getTranslations("mailings"), getTranslations()]);
  const [configured, campaigns, rawSources, segments, channels, extraPlaceholders] = await Promise.all([isMailConfigured(), listCampaigns(), listSourcesWithOptions(user.role), listSegments(user.role), listChannelInfo(), channelPlaceholderKeys()]);
  const label = (key: string) => tRoot(key as never);
  const sources: WizardSource[] = rawSources.map((source) => {
    const base = `${source.moduleKey}.recipients.${source.key}`;
    return {
      id: source.id,
      label: `${label(`${base}.label`)} (${label(`${source.moduleKey}.module.label`)})`,
      // Kanal eklentilerinin ek yer tutucuları (ör. {telegramLink}) her listede kullanılabilir.
      placeholders: [...source.placeholders, ...extraPlaceholders],
      sampleVars: source.sampleVars,
      filters: source.filters.map((filter) => ({
        key: filter.key,
        label: label(`${base}.filters.${filter.key}.label`),
        defaults: filter.defaults,
        // Dinamik seçeneklerde (ör. şehir) değer aynı zamanda etikettir.
        options: filter.options.map((value) => ({ value, label: filter.dynamic ? value : label(`${base}.filters.${filter.key}.options.${value}`) })),
      })),
    };
  });
  const sourceLabel = (id: string) => {
    const [moduleKey, key] = id.split(":");
    return key === "api" ? label(`${moduleKey}.module.label`) : (sources.find((source) => source.id === id)?.label ?? id);
  };
  const stats = await deliveryStats(campaigns.map((row) => row.id));
  const board: BoardCampaign[] = campaigns.map((row) => ({
    tracking: row.tracking,
    stats: stats.get(row.id) ?? null,
    id: row.id,
    name: row.name,
    subject: row.subject,
    channel: row.channel,
    sourceLabel: sourceLabel(row.source),
    status: row.status,
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    skippedNoEmail: row.skippedNoEmail,
    skippedOptOut: row.skippedOptOut,
    createdAt: row.createdAt.toISOString(),
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    workflowId: row.workflowId,
    createdByLabel: row.createdByLabel,
    draft: row.status === "DRAFT"
      ? { id: row.id, name: row.name, channel: row.channel, sourceId: row.source, filter: row.filter as Record<string, string[]>, subject: row.subject, body: row.body, bodyHtml: row.bodyHtml, design: row.design, scheduledAt: row.scheduledAt?.toISOString() ?? null }
      : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {!configured ? (
        <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">
          {t("notConfigured")}{" "}
          <Link href="/mail" className="underline">
            {t("openSettings")}
          </Link>
        </p>
      ) : null}
      <CampaignBoard
        campaigns={board}
        canCreate={can(user.role, mailingsPermissions, "create")}
        sources={sources}
        segments={segments}
        channels={channels}
        defaultText={t("defaultBody")}
        initialSourceId={sourceId ?? null}
        initialFilter={initialFilter ?? null}
      />
    </div>
  );
}
