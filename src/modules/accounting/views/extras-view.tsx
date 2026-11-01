import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { AssetForm, DeleteFlatRateButton, DisposeAssetButton, FlatRateForm, ReleaseReserveButton, ReserveForm, LinkInventoryButton } from "../components/extras-forms";
import { isInventoryUsable } from "../services/inventory-link";
import { accountingPermissions } from "../permissions";
import { getReserveOverview, listAssets, listFlatRates } from "../queries/assets";
import { flatRateYearTotals, type FlatRateKind } from "../services/afa";
import { getTaxSettings } from "../services/tax";
import { freeReserveLimitCents, taxDeadlines } from "../services/tax-calendar";
import { berlinToday } from "../utils";

export type ExtrasTab = "anlagen" | "pauschalen" | "fristen" | "ruecklagen" | "pruefung";
const TABS: ExtrasTab[] = ["anlagen", "pauschalen", "fristen", "ruecklagen", "pruefung"];
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10).split("-").reverse().join(".") : "—");

/** ACC-8: Anlagenverzeichnis (AfA), Pauschalen, Steuerfristen, § 62 AO Rücklagen, Kassenprüfung. */
export async function ExtrasView({ tab, year }: { tab: ExtrasTab; year: number }) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("accounting.extras");
  const canEdit = can(user.role, accountingPermissions, "create");
  const href = (next: Partial<{ tab: ExtrasTab; year: number }>) => `/muhasebe/ekler?sekme=${next.tab ?? tab}&yil=${next.year ?? year}`;
  const pill = (active: boolean) => `rounded-medium px-3 py-1.5 ${active ? "bg-primary text-white" : "border border-default-200"}`;
  const table = "w-full text-small";
  const th = "p-2 text-left text-tiny uppercase text-default-500";
  const td = "border-t border-default-100 p-2";

  let body: React.ReactNode = null;
  if (tab === "anlagen") {
    const [assets, inventoryOn] = await Promise.all([listAssets(year), isInventoryUsable()]);
    const unlinked = assets.filter((asset) => !asset.inventoryItemId && !asset.disposalDate).length;
    body = (
      <>
        {canEdit ? <AssetForm /> : null}
        <p className="text-tiny text-default-500">{t("assets.hint")}</p>
        {inventoryOn ? (
          <div className="flex flex-wrap items-center gap-2 rounded-medium bg-primary-50 p-3 text-small text-primary-700 dark:bg-primary-500/10">
            <span>{t("assets.inventorySync")}</span>
            {canEdit && unlinked > 0 ? <LinkInventoryButton /> : null}
          </div>
        ) : null}
        <table className={table}>
          <thead><tr><th className={th}>{t("assets.name")}</th><th className={th}>{t("assets.date")}</th><th className={th}>{t("assets.method")}</th><th className={`${th} text-right`}>{t("assets.cost")}</th><th className={`${th} text-right`}>{t("assets.afa", { year })}</th><th className={`${th} text-right`}>{t("assets.bookValue")}</th><th className={th} /></tr></thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td className={td}>{asset.name}{asset.inventoryItemId ? <span className="ml-2 rounded-small bg-default-100 px-1.5 text-tiny text-default-600">{t("assets.inInventory")}</span> : null}{asset.disposalDate ? <span className="ml-2 text-tiny text-default-400">{t("assets.disposedOn", { date: day(asset.disposalDate) })}</span> : null}</td>
                <td className={td}>{day(asset.acquisitionDate)}</td>
                <td className={td}>{t(`assets.methods.${asset.method}`)}{asset.method === "LINEAR" ? ` · ${asset.usefulLifeMonths} M.` : ""}</td>
                <td className={`${td} text-right tabular-nums`}>{euro(asset.costCents)}</td>
                <td className={`${td} text-right tabular-nums`}>{euro(asset.afaCents)}</td>
                <td className={`${td} text-right tabular-nums`}>{euro(asset.bookValueEndCents)}</td>
                <td className={`${td} text-right`}>{canEdit && !asset.disposalDate ? <DisposeAssetButton id={asset.id} /> : null}</td>
              </tr>
            ))}
            <tr className="font-semibold"><td className={td} colSpan={4}>{t("total")}</td><td className={`${td} text-right tabular-nums`}>{euro(assets.reduce((sum, asset) => sum + asset.afaCents, 0))}</td><td className={td} colSpan={2} /></tr>
          </tbody>
        </table>
      </>
    );
  }
  if (tab === "pauschalen") {
    const flats = await listFlatRates(year);
    const totals = flatRateYearTotals(flats.map((flat) => ({ kind: flat.kind as FlatRateKind, amountCents: flat.amountCents })));
    body = (
      <>
        {canEdit ? <FlatRateForm /> : null}
        <p className="text-tiny text-default-500">{t("flat.hint")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(totals) as FlatRateKind[]).map((kind) => (
            <div key={kind} className="rounded-medium border border-default-200 p-3">
              <div className="text-tiny text-default-500">{t(`flat.kinds.${kind}`)}</div>
              <div className="font-semibold tabular-nums">{euro(totals[kind].cappedCents)}</div>
              {totals[kind].cappedCents < totals[kind].totalCents ? <div className="text-tiny text-warning-600">{t("flat.capped", { amount: euro(totals[kind].totalCents) })}</div> : null}
            </div>
          ))}
        </div>
        <table className={table}>
          <tbody>
            {flats.map((flat) => (
              <tr key={flat.id}>
                <td className={td}>{day(flat.date)}</td>
                <td className={td}>{t(`flat.kinds.${flat.kind}`)}</td>
                <td className={td}>{`${Number(flat.quantity).toLocaleString("de-DE")} ${t(`flat.unitShort.${flat.kind}`)}`}</td>
                <td className={`${td} text-default-500`}>{flat.note ?? ""}</td>
                <td className={`${td} text-right tabular-nums`}>{euro(flat.amountCents)}</td>
                <td className={`${td} text-right`}>{canEdit ? <DeleteFlatRateButton id={flat.id} label={t("flat.delete")} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
  if (tab === "fristen") {
    const settings = await getTaxSettings(getDb());
    const today = berlinToday();
    const deadlines = [...taxDeadlines(year, { vatPeriod: settings.vatPeriod, extension: settings.vatExtension, smallBusiness: settings.smallBusiness })];
    body = (
      <>
        <p className="text-tiny text-default-500">{t("deadlines.hint")}</p>
        <table className={table}>
          <tbody>
            {deadlines.map((item) => {
              const days = Math.round((item.due.getTime() - today.getTime()) / 86_400_000);
              return (
                <tr key={`${item.key}-${item.period}`}>
                  <td className={`${td} tabular-nums ${days < 0 ? "text-default-400" : days <= 14 ? "font-semibold text-warning-700" : ""}`}>{day(item.due)}</td>
                  <td className={td}>{t(`deadlines.kinds.${item.key}`, { period: item.period })}</td>
                  <td className={`${td} text-right text-tiny text-default-500`}>{days < 0 ? t("deadlines.past") : t("deadlines.inDays", { days })}</td>
                  <td className={`${td} text-right`}>{item.key === "ustva" ? <Link className="text-primary hover:underline" href={`/muhasebe/vergi?sekme=ustva&yil=${year}`}>{t("deadlines.open")}</Link> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }
  if (tab === "ruecklagen") {
    const overview = await getReserveOverview(year);
    const limit = freeReserveLimitCents({ assetManagementSurplusCents: overview.assetManagementSurplusCents, otherFundsCents: overview.otherFundsCents });
    const freeUsed = overview.reserves.filter((reserve) => reserve.kind === "FREE" && reserve.year === year).reduce((sum, reserve) => sum + reserve.amountCents, 0);
    body = (
      <>
        <div className="rounded-medium bg-default-100 p-3 text-small">
          {t("reserves.limit", { limit: euro(limit), used: euro(freeUsed), asset: euro(overview.assetManagementSurplusCents), other: euro(overview.otherFundsCents) })}
        </div>
        {canEdit ? <ReserveForm year={year} /> : null}
        <p className="text-tiny text-default-500">{t("reserves.hint")}</p>
        <table className={table}>
          <tbody>
            {overview.reserves.map((reserve) => (
              <tr key={reserve.id} className={reserve.releasedYear ? "text-default-400" : ""}>
                <td className={td}>{reserve.year}</td>
                <td className={td}>{t(`reserves.kinds.${reserve.kind}`)}</td>
                <td className={td}>{reserve.purpose}</td>
                <td className={`${td} text-tiny`}>{reserve.releasedYear ? t("reserves.releasedIn", { year: reserve.releasedYear }) : reserve.plannedUseYear ? t("reserves.planned", { year: reserve.plannedUseYear }) : ""}</td>
                <td className={`${td} text-right tabular-nums`}>{euro(reserve.amountCents)}</td>
                <td className={`${td} text-right`}>{canEdit && !reserve.releasedYear ? <ReleaseReserveButton id={reserve.id} year={year} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
  if (tab === "pruefung") {
    body = (
      <>
        <p className="text-small text-default-600">{t("auditor.intro")}</p>
        <div className="flex flex-wrap gap-2">
          {(["de", "tr"] as const).map((lang) => (
            <a key={lang} href={`/api/accounting/extras/auditor-report?year=${year}&lang=${lang}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-medium border border-default-300 px-3 py-2 text-small font-medium hover:bg-default-100">
              <Download className="h-4 w-4" aria-hidden />
              {t("auditor.download", { year, lang: lang.toUpperCase() })}
            </a>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2 text-small">
            <Link className="text-primary" href={href({ year: year - 1 })}>{year - 1}</Link>
            <span className="font-semibold">{year}</span>
            <Link className="text-primary" href={href({ year: year + 1 })}>{year + 1}</Link>
          </div>
        }
      />
      <nav className="flex flex-wrap gap-2 text-small">
        {TABS.map((key) => (
          <Link key={key} href={href({ tab: key })} className={pill(tab === key)}>
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">{body}</div>
    </div>
  );
}
