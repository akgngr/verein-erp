"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, XCircle, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TestStatistics {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  openAlerts: number;
  latestRun: any;
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
  testRun: TestRun;
}

export default function SecurityMonitorPage() {
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await fetch("/api/modules/security-monitor/stats");
      const stats = await statsResponse.json();
      setStatistics(stats);

      // Fetch recent runs
      const runsResponse = await fetch("/api/modules/security-monitor/runs?limit=10");
      const runsData = await runsResponse.json();
      setRecentRuns(runsData.runs);

      // Fetch alerts
      const alertsResponse = await fetch("/api/modules/security-monitor/alerts?limit=10&status=open");
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.alerts);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async (testSuite: string = "security") => {
    try {
      setRunning(true);
      
      const response = await fetch("/api/modules/security-monitor/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSuite, triggeredBy: "manual" }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data after test run
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to run tests:", error);
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-orange-100 text-orange-800";
      case "skipped":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>{t("securityMonitor.loading")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("securityMonitor.title")}</h1>
        <Button onClick={() => runTests("security")} disabled={running}>
          {running ? t("securityMonitor.running") : t("securityMonitor.runTests")}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("securityMonitor.totalRuns")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalRuns || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("securityMonitor.passRate")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.passRate || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("securityMonitor.passed")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics?.passedRuns || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("securityMonitor.failed")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics?.failedRuns || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("securityMonitor.openAlerts")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics?.openAlerts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Test Runs */}
      <Card>
        <CardHeader>
          <CardTitle>{t("securityMonitor.recentRuns")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <p className="text-muted-foreground">{t("securityMonitor.noRuns")}</p>
          ) : (
            <div className="space-y-4">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{run.testSuite}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Badge className={`${getStatusColor(run.status)}`}>
                      {run.status}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{run.passed}/{run.totalTests}</span>
                    <span className="text-muted-foreground ml-2">
                      {run.durationMs}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>{t("securityMonitor.openAlerts")}</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">{t("securityMonitor.noAlerts")}</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-4 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)} mt-2`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{alert.message}</h3>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
