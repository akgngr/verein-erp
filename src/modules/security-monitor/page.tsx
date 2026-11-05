"use client";

import { Card, CardBody } from "@heroui/react";
import { Button } from "@heroui/react";
import { Badge } from "@heroui/react";
import { Clock, ShieldCheck, PlayCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

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

export default function SecurityMonitorPage() {
  const t = useTranslations("security-monitor");
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const statsResponse = await fetch("/api/modules/security-monitor/stats");
      const stats = await statsResponse.json();
      setStatistics(stats);

      const runsResponse = await fetch("/api/modules/security-monitor/runs?limit=10");
      const runsData = await runsResponse.json();
      setRecentRuns(runsData.runs || []);

      const alertsResponse = await fetch("/api/modules/security-monitor/alerts?limit=10&status=open");
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  const runTests = async () => {
    try {
      setRunning(true);
      
      const response = await fetch("/api/modules/security-monitor/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSuite: "security", triggeredBy: "manual" }),
      });

      await response.json();
      await fetchData();
    } catch (error) {
      console.error("Failed to run tests:", error);
    } finally {
      setRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-danger";
      case "high": return "bg-warning";
      case "medium": return "bg-secondary";
      default: return "bg-primary";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-default-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">{t("title")}</h1>
        </div>
        <Button
          color="primary"
          onClick={runTests}
          isLoading={running}
          startContent={<PlayCircle className="h-4 w-4" />}
        >
          {t("runTests")}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card shadow="sm">
          <CardBody className="px-4 py-3">
            <p className="text-tiny uppercase tracking-wide text-default-400">{t("totalRuns")}</p>
            <p className="text-lg font-semibold">{statistics?.totalRuns || 0}</p>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardBody className="px-4 py-3">
            <p className="text-tiny uppercase tracking-wide text-default-400">{t("passRate")}</p>
            <p className="text-lg font-semibold text-success">{statistics?.passRate || 0}%</p>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardBody className="px-4 py-3">
            <p className="text-tiny uppercase tracking-wide text-default-400">{t("passed")}</p>
            <p className="text-lg font-semibold text-success">{statistics?.passedRuns || 0}</p>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardBody className="px-4 py-3">
            <p className="text-tiny uppercase tracking-wide text-default-400">{t("failed")}</p>
            <p className="text-lg font-semibold text-danger">{statistics?.failedRuns || 0}</p>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardBody className="px-4 py-3">
            <p className="text-tiny uppercase tracking-wide text-default-400">{t("openAlerts")}</p>
            <p className="text-lg font-semibold text-warning">{statistics?.openAlerts || 0}</p>
          </CardBody>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card shadow="sm">
        <CardBody className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-medium font-semibold">{t("recentRuns")}</h2>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-default-400">{t("noRuns")}</p>
          ) : (
            <div className="divide-y divide-default-200">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-default-400" />
                    <div>
                      <p className="font-medium">{run.testSuite}</p>
                      <p className="text-tiny text-default-400">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={run.status === "passed" ? "success" : run.status === "failed" ? "danger" : "warning"}>
                      {run.status}
                    </Badge>
                    <span className="text-tiny text-default-400">{run.passed}/{run.totalTests}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Alerts */}
      <Card shadow="sm">
        <CardBody className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-medium font-semibold">{t("openAlerts")}</h2>
          </div>
          {alerts.length === 0 ? (
            <p className="text-default-400">{t("noAlerts")}</p>
          ) : (
            <div className="divide-y divide-default-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 py-3">
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)} mt-1.5`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{alert.message}</p>
                      <Badge color={alert.severity === "critical" ? "danger" : "default"}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-tiny text-default-400">{alert.type}</p>
                    <p className="text-tiny text-default-400">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
