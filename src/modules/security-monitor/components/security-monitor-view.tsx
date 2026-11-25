"use client";
import { ActionButton } from "@/shared/components/ui/action-button";
import { StatCard } from "@/shared/components/ui/stat-card";
import { StatusChip } from "@/shared/components/ui/status-chip";
import { SurfaceCard } from "@/shared/components/ui/surface-card";

import { Clock, PlayCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface TestStatistics {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  openAlerts: number;
  passRate: number;
}

interface TestRun {
  id: string;
  createdAt: string;
  testSuite: string;
  status: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
}

interface Alert {
  id: string;
  createdAt: string;
  severity: string;
  type: string;
  message: string;
  status: string;
}

export function SecurityMonitorView({ canRun = false }: { canRun?: boolean }) {
  const t = useTranslations("security-monitor.monitor");
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [statsResponse, runsResponse, alertsResponse] = await Promise.all([
      fetch("/api/security-monitor/stats"),
      fetch("/api/security-monitor/runs?limit=10"),
      fetch("/api/security-monitor/alerts?limit=10&status=open"),
    ]);

    const responses = [
      { endpoint: "stats", response: statsResponse },
      { endpoint: "runs", response: runsResponse },
      { endpoint: "alerts", response: alertsResponse },
    ];

    const failures = await Promise.all(
      responses
        .filter(({ response }) => !response.ok)
        .map(async ({ endpoint, response }) => {
          const body = await response.text().catch(() => "");
          let detail = body;

          try {
            const parsed: unknown = JSON.parse(body);
            if (
              typeof parsed === "object" &&
              parsed !== null &&
              "error" in parsed &&
              typeof parsed.error === "string"
            ) {
              detail = parsed.error;
            }
          } catch {
            // Keep the raw response body when it is not JSON.
          }

          return `${endpoint} returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`;
        }),
    );

    if (failures.length > 0) {
      throw new Error(`SECURITY_MONITOR_FETCH_FAILED: ${failures.join("; ")}`);
    }

    const [stats, runsData, alertsData] = await Promise.all([
      statsResponse.json(),
      runsResponse.json(),
      alertsResponse.json(),
    ]);

    return {
      statistics: stats as TestStatistics,
      recentRuns: (runsData.runs || []) as TestRun[],
      alerts: (alertsData.alerts || []) as Alert[],
    };
  }, []);

  useEffect(() => {
    let active = true;

    void fetchData()
      .then((data) => {
        if (!active) return;
        setStatistics(data.statistics);
        setRecentRuns(data.recentRuns);
        setAlerts(data.alerts);
      })
      .catch((error) => {
        console.error("Failed to fetch security monitor data:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchData]);

  const runTests = async () => {
    try {
      setRunning(true);
      const response = await fetch("/api/security-monitor/runs", {
        method: "POST",
      });

      if (!response.ok) throw new Error("SECURITY_MONITOR_QUEUE_FAILED");
      await response.json();
      setQueueMessage(t("queued"));
      const data = await fetchData();
      setStatistics(data.statistics);
      setRecentRuns(data.recentRuns);
      setAlerts(data.alerts);
    } catch (error) {
      console.error("Failed to queue security tests:", error);
    } finally {
      setRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-danger";
      case "high":
        return "bg-warning";
      case "medium":
        return "bg-secondary";
      default:
        return "bg-accent";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-ink-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-bold">{t("title")}</h1>
        </div>
        {canRun ? (
          <ActionButton
            size="md"
            isPending={running}
            startIcon={<PlayCircle className="h-4 w-4" />}
            onPress={() => void runTests()}
          >
            {t("runTests")}
          </ActionButton>
        ) : null}
      </div>

      {queueMessage ? (
        <p className="text-sm text-success">{queueMessage}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t("totalRuns")} value={statistics?.totalRuns || 0} />
        <StatCard
          label={t("passRate")}
          value={`${statistics?.passRate || 0}%`}
          valueClassName="text-success"
        />
        <StatCard
          label={t("passed")}
          value={statistics?.passedRuns || 0}
          valueClassName="text-success"
        />
        <StatCard
          label={t("failed")}
          value={statistics?.failedRuns || 0}
          valueClassName="text-danger"
        />
        <StatCard
          label={t("openAlerts")}
          value={statistics?.openAlerts || 0}
          valueClassName="text-warning"
        />
      </div>

      <SurfaceCard contentClassName="gap-4 p-6">
        <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("recentRuns")}</h2>
          </div>
        {recentRuns.length === 0 ? (
            <p className="text-ink-400">{t("noRuns")}</p>
          ) : (
            <div className="divide-y divide-ink-200">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-ink-400" />
                    <div>
                      <p className="font-medium">{run.testSuite}</p>
                      <p className="text-xs text-ink-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip
                      tone={
                        run.status === "passed"
                          ? "success"
                          : run.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {run.status}
                    </StatusChip>
                    <span className="text-xs text-ink-400">
                      {run.passed}/{run.totalTests}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
      </SurfaceCard>

      <SurfaceCard contentClassName="gap-4 p-6">
        <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("openAlerts")}</h2>
          </div>
        {alerts.length === 0 ? (
            <p className="text-ink-400">{t("noAlerts")}</p>
          ) : (
            <div className="divide-y divide-ink-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 py-3">
                  <div
                    className={`mt-1.5 h-2 w-2 rounded-full ${getSeverityColor(alert.severity)}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{alert.message}</p>
                      <StatusChip
                        tone={alert.severity === "critical" ? "danger" : "default"}
                      >
                        {alert.severity}
                      </StatusChip>
                    </div>
                    <p className="text-xs text-ink-400">{alert.type}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </SurfaceCard>
    </div>
  );
}
