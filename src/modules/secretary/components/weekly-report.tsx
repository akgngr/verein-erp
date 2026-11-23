"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/shared/components/kit";

import { getWeeklyReportStateAction, requestWeeklyReportAction } from "../actions/weekly-report";

type ReportStatus = "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "CANCELLED" | "EXPIRED" | "DELETED";

export interface WeeklyReportLabels {
  title: string;
  description: string;
  request: string;
  check: string;
  files: string;
  pending: string;
  ready: string;
  failed: string;
  error: string;
}

/** An owner-scoped generation ID is only used to check the current request. Files owns the download. */
export function SecretaryWeeklyReport({ labels }: { labels: WeeklyReportLabels }) {
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function request() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const result = await requestWeeklyReportAction({});
      if (!result.ok) { setError(true); return; }
      setGenerationId(result.data.generationId);
      setStatus("QUEUED");
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function check() {
    if (pending || !generationId) return;
    setPending(true);
    setError(false);
    try {
      const result = await getWeeklyReportStateAction({ generationId });
      if (!result.ok) { setError(true); return; }
      setStatus(result.data.status as ReportStatus);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const finished = status === "READY" || status === "FAILED" || status === "CANCELLED" || status === "EXPIRED" || status === "DELETED";
  const statusLabel = status === "READY" ? labels.ready : finished ? labels.failed : labels.pending;

  return (
    <section aria-label={labels.title} className="space-y-3 rounded-xl border border-ink-200/80 p-4">
      <h2 className="text-base font-semibold">{labels.title}</h2>
      <p className="text-sm text-ink-500">{labels.description}</p>
      <div className="flex flex-wrap items-center gap-3" aria-busy={pending}>
        <Button variant="primary" isPending={pending && !generationId} isDisabled={pending} onPress={() => void request()}>{labels.request}</Button>
        {generationId && !finished ? <Button variant="secondary" isPending={pending} isDisabled={pending} onPress={() => void check()}>{labels.check}</Button> : null}
        {status ? <span role="status" className="text-sm text-ink-500">{statusLabel}</span> : null}
        {status === "READY" ? <Link className="text-sm text-accent underline-offset-4 hover:underline focus-visible:underline" href="/dosyalar">{labels.files}</Link> : null}
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{labels.error}</p> : null}
    </section>
  );
}
