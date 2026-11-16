"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Button, Spinner, Card, Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { actionVariant } from "@/shared/components/ui/action-appearance";

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

export function SecurityMonitorView() {
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-bold">{t("title")}</h1>
        </div>
        <Button
          onClick={runTests}
          variant={actionVariant("primary", "solid")}
          isPending={running}
        >
          {running ? <Spinner size="sm" color="current" /> : null}
          {<PlayCircle className="h-4 w-4" />}
          {t("runTests")}
        </Button>
      </div>

      {queueMessage ? (
        <p className="text-sm text-success">{queueMessage}</p>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {t("totalRuns")}
            </p>
            <p className="text-lg font-semibold">
              {statistics?.totalRuns || 0}
            </p>
          </Card.Content>
        </Card>
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {t("passRate")}
            </p>
            <p className="text-lg font-semibold text-success">
              {statistics?.passRate || 0}%
            </p>
          </Card.Content>
        </Card>
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {t("passed")}
            </p>
            <p className="text-lg font-semibold text-success">
              {statistics?.passedRuns || 0}
            </p>
          </Card.Content>
        </Card>
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {t("failed")}
            </p>
            <p className="text-lg font-semibold text-danger">
              {statistics?.failedRuns || 0}
            </p>
          </Card.Content>
        </Card>
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {t("openAlerts")}
            </p>
            <p className="text-lg font-semibold text-warning">
              {statistics?.openAlerts || 0}
            </p>
          </Card.Content>
        </Card>
      </div>

      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
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
                    <Chip
                      variant="soft"
                      color={statusTone(
                        run.status === "passed"
                          ? "success"
                          : run.status === "failed"
                            ? "danger"
                            : "warning",
                      )}
                      style={statusStyle(
                        run.status === "passed"
                          ? "success"
                          : run.status === "failed"
                            ? "danger"
                            : "warning",
                      )}
                    >
                      {run.status}
                    </Chip>
                    <span className="text-xs text-ink-400">
                      {run.passed}/{run.totalTests}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
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
                    className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)} mt-1.5`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{alert.message}</p>
                      <Chip
                        variant="soft"
                        color={statusTone(
                          alert.severity === "critical" ? "danger" : "default",
                        )}
                        style={statusStyle(
                          alert.severity === "critical" ? "danger" : "default",
                        )}
                      >
                        {alert.severity}
                      </Chip>
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
        </Card.Content>
      </Card>
    </div>
  );
}
