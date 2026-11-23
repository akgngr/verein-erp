"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { ActionButton } from "@/shared/components/ui/action-button";
import { StatCard } from "@/shared/components/ui/stat-card";
import { StatusChip } from "@/shared/components/ui/status-chip";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import type { ModuleReadinessItem, ModuleReadinessReport } from "../services/readiness";
import { getModuleReadinessAction } from "../actions/get-readiness";

type FilterTab = "all" | "issues" | "core" | "official" | "extension";

export function ReadinessCockpit({
  initialReport,
}: {
  initialReport: ModuleReadinessReport;
}) {
  const t = useTranslations("system.readiness");
  const [report, setReport] = useState<ModuleReadinessReport>(initialReport);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getModuleReadinessAction();
      if (res && "data" in res && res.data) {
        setReport(res.data);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredModules = useMemo(() => {
    return report.modules.filter((m) => {
      // Search filter
      const matchesSearch =
        m.moduleKey.toLowerCase().includes(search.toLowerCase()) ||
        m.moduleLabel.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === "issues") {
        return m.overallStatus !== "HEALTHY";
      }
      if (activeTab === "core") {
        return m.category === "CORE";
      }
      if (activeTab === "official") {
        return m.category === "OFFICIAL";
      }
      if (activeTab === "extension") {
        return m.category === "EXTENSION";
      }
      return true;
    });
  }, [report.modules, search, activeTab]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("stats.activeModules")}
          value={`${report.summary.activeModules} / ${report.summary.totalModules}`}
          icon={<Settings className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label={t("stats.healthyModules")}
          value={report.summary.healthyCount}
          valueClassName="text-success"
          icon={<CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
        />
        <StatCard
          label={t("stats.warnings")}
          value={report.summary.warningCount}
          valueClassName={report.summary.warningCount > 0 ? "text-warning" : "text-foreground"}
          icon={<AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />}
        />
        <StatCard
          label={t("stats.failedJobs")}
          value={report.summary.totalFailedJobs}
          valueClassName={report.summary.totalFailedJobs > 0 ? "text-danger" : "text-foreground"}
          icon={<XCircle className="h-5 w-5 text-danger" aria-hidden="true" />}
        />
      </div>

      {/* Control bar: search, filters, refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-ink-400 hover:text-foreground"
            }`}
          >
            {t("tabs.all")} ({report.modules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("issues")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "issues"
                ? "bg-warning text-warning-foreground"
                : "bg-surface-elevated text-ink-400 hover:text-foreground"
            }`}
          >
            {t("tabs.issues")} ({report.summary.warningCount + report.summary.criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("core")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "core"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-ink-400 hover:text-foreground"
            }`}
          >
            {t("tabs.core")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("official")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "official"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-ink-400 hover:text-foreground"
            }`}
          >
            {t("tabs.official")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("extension")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "extension"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-ink-400 hover:text-foreground"
            }`}
          >
            {t("tabs.extension")}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-border bg-surface-elevated py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-ink-400 focus:border-primary focus:outline-none"
            />
          </div>

          <ActionButton
            onClick={handleRefresh}
            pending={isRefreshing}
            emphasis="medium"
            size="sm"
            icon={<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />}
          >
            {t("refresh")}
          </ActionButton>
        </div>
      </div>

      {/* Module Health List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredModules.map((item) => (
          <ModuleHealthCard key={item.moduleKey} item={item} />
        ))}
      </div>

      {filteredModules.length === 0 ? (
        <SurfaceCard className="py-12 text-center text-ink-400">
          <p className="text-sm">{t("noModulesFound")}</p>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

function ModuleHealthCard({ item }: { item: ModuleReadinessItem }) {
  const t = useTranslations("system.readiness");

  const overallTone =
    item.overallStatus === "HEALTHY"
      ? "success"
      : item.overallStatus === "WARNING"
        ? "warning"
        : "danger";

  return (
    <SurfaceCard
      interactive
      className="flex flex-col justify-between overflow-hidden p-5 transition-shadow hover:shadow-md"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{item.moduleLabel}</h3>
              <span className="font-mono text-xs text-ink-400">({item.moduleKey})</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-surface-elevated px-2 py-0.5 text-[10px] font-medium uppercase text-ink-400">
                {item.category}
              </span>
              {item.isProtected ? (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t("status.protected")}
                </span>
              ) : null}
            </div>
          </div>

          <StatusChip tone={overallTone}>
            {item.overallStatus === "HEALTHY"
              ? t("status.healthy")
              : item.overallStatus === "WARNING"
                ? t("status.warning")
                : t("status.critical")}
          </StatusChip>
        </div>

        {/* 4 Health Pillars Grid */}
        <div className="my-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {/* 1. Configuration */}
          <div className="rounded-lg bg-surface-elevated/50 p-2.5">
            <div className="flex items-center gap-1.5 text-ink-400">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("pillars.config")}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {item.configuration.status === "COMPLETE" ||
              item.configuration.status === "NOT_REQUIRED" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  <span className="font-medium text-success">{t("pillars.complete")}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                  <span className="font-medium text-warning">{t("pillars.incomplete")}</span>
                </>
              )}
            </div>
          </div>

          {/* 2. Access Grants */}
          <div className="rounded-lg bg-surface-elevated/50 p-2.5">
            <div className="flex items-center gap-1.5 text-ink-400">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("pillars.access")}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {item.accessGrants.status === "APPROVED" || item.accessGrants.status === "NONE" ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  <span className="font-medium text-success">{t("pillars.approved")}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                  <span className="font-medium text-warning">{t("pillars.pending")}</span>
                </>
              )}
            </div>
          </div>

          {/* 3. Worker Heartbeat */}
          <div className="rounded-lg bg-surface-elevated/50 p-2.5">
            <div className="flex items-center gap-1.5 text-ink-400">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("pillars.heartbeat")}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {item.workerHeartbeat.status === "HEALTHY" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  <span className="font-medium text-success">{t("pillars.active")}</span>
                </>
              ) : item.workerHeartbeat.status === "STALE" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                  <span className="font-medium text-danger">{t("pillars.stale")}</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                  <span className="font-medium text-ink-400">{t("pillars.idle")}</span>
                </>
              )}
            </div>
          </div>

          {/* 4. Background Queue / Failed Jobs */}
          <div className="rounded-lg bg-surface-elevated/50 p-2.5">
            <div className="flex items-center gap-1.5 text-ink-400">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("pillars.queue")}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {item.failedJobs.totalFailed === 0 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  <span className="font-medium text-success">{t("pillars.clean")}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                  <span className="font-medium text-danger">
                    {item.failedJobs.totalFailed} {t("pillars.failed")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Breakdown of failed jobs by redacted category */}
        {item.failedJobs.totalFailed > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-danger/20 bg-danger/5 p-2 text-xs">
            <span className="font-medium text-danger">{t("failedBreakdown")}:</span>
            {Object.entries(item.failedJobs.categories).map(([cat, count]) => (
              <span
                key={cat}
                className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[11px] text-danger"
              >
                {cat}: {count}
              </span>
            ))}
          </div>
        ) : null}

        {/* Notification Channel status if applicable */}
        {item.notificationChannels ? (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-surface-elevated/50 p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-ink-400" aria-hidden="true" />
              <span className="font-medium">{t("notificationChannels")}:</span>
              <span>
                {item.notificationChannels.enabledChannels.length > 0
                  ? item.notificationChannels.enabledChannels.join(", ")
                  : t("noChannelsConfigured")}
              </span>
            </div>
            {!item.notificationChannels.configured && item.notificationChannels.fixHref ? (
              <Link
                href={item.notificationChannels.fixHref}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <span>{t("configureChannels")}</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Guidance Callout if any issue exists */}
      {item.overallStatus !== "HEALTHY" ? (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">{t("guidanceTitle")}</p>
              <p className="text-ink-400">
                {item.configuration.guidanceKey
                  ? t(`guidance.${item.configuration.guidanceKey}`)
                  : item.accessGrants.guidanceKey
                    ? t(`guidance.${item.accessGrants.guidanceKey}`)
                    : item.failedJobs.guidanceKey
                      ? t(`guidance.${item.failedJobs.guidanceKey}`)
                      : t("guidance.generalIssue")}
              </p>
            </div>
          </div>

          {(item.configuration.fixHref ||
            item.accessGrants.fixHref ||
            item.failedJobs.fixHref) ? (
            <Link
              href={
                item.configuration.fixHref ??
                item.accessGrants.fixHref ??
                item.failedJobs.fixHref ??
                "/ayarlar"
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-warning/20 px-3 py-1.5 font-medium text-warning hover:bg-warning/30"
            >
              <span>{t("fixIssue")}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
