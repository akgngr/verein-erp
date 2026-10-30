"use client";

import { addToast, Button, Input } from "@heroui/react";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatDate } from "@/shared/utils";
import { cn } from "@/shared/utils";

import { saveAttendanceAction } from "../actions/progress-actions";
import { ATTENDANCE_STATUS_VALUES } from "../constants";
import type { AttendanceMap, AttendanceSummary, ProgressAttendanceStatus } from "../types";

const STATUS_STYLE: Record<ProgressAttendanceStatus, string> = {
  PRESENT: "bg-success-100 text-success-700 border-success-300 dark:bg-success-500/20 dark:text-success-300",
  LATE: "bg-warning-100 text-warning-700 border-warning-300 dark:bg-warning-500/20 dark:text-warning-300",
  EXCUSED: "bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300",
  ABSENT: "bg-danger-100 text-danger-700 border-danger-300 dark:bg-danger-500/20 dark:text-danger-300",
};

type Session = { id: string; date: Date; startTime: string | null; topic: string | null; isCancelled: boolean };
type Enrollment = { id: string; studentLabel: string; studentNumber: string };

/** Ders seçilir, her öğrenci için durum işaretlenir ve toplu kaydedilir; altta devam oranları. */
export function AttendancePanel({
  courseId,
  sessions,
  enrollments,
  attendance,
  summaries,
  defaultSessionId,
  canEdit,
}: {
  courseId: string;
  sessions: Session[];
  enrollments: Enrollment[];
  attendance: AttendanceMap;
  summaries: AttendanceSummary[];
  defaultSessionId: string | null;
  canEdit: boolean;
}) {
  const t = useTranslations("progress.attendance");
  const tStatus = useTranslations("progress.attendanceStatus");
  const router = useRouter();
  const [sessionId, setSessionId] = useState(defaultSessionId ?? "");
  const [draft, setDraft] = useState<Record<string, { status: ProgressAttendanceStatus | null; note: string }>>(() => initial(defaultSessionId));
  const [busy, setBusy] = useState(false);

  function initial(id: string | null) {
    const existing = id ? (attendance[id] ?? {}) : {};
    return Object.fromEntries(enrollments.map((enrollment) => [enrollment.id, { status: existing[enrollment.id]?.status ?? null, note: existing[enrollment.id]?.note ?? "" }]));
  }

  if (sessions.length === 0) return <p className="text-small text-default-500">{t("noSessions")}</p>;
  if (enrollments.length === 0) return <p className="text-small text-default-500">{t("noStudents")}</p>;

  const set = (enrollmentId: string, patch: Partial<{ status: ProgressAttendanceStatus | null; note: string }>) =>
    setDraft((current) => ({ ...current, [enrollmentId]: { ...current[enrollmentId], ...patch } }));

  const save = async () => {
    const entries = enrollments
      .filter((enrollment) => draft[enrollment.id]?.status)
      .map((enrollment) => ({ enrollmentId: enrollment.id, status: draft[enrollment.id].status, note: draft[enrollment.id].note }));
    if (entries.length === 0) return;
    setBusy(true);
    const result = await saveAttendanceAction({ courseId, sessionId, entries });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("saved", { count: result.data.saved }), color: "success" });
    router.refresh();
  };

  const summaryById = new Map(summaries.map((summary) => [summary.enrollmentId, summary]));
  const session = sessions.find((candidate) => candidate.id === sessionId);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-col gap-1 text-small">
          <span className="font-medium">{t("session")}</span>
          <select
            className="h-10 rounded-medium border border-default-200 bg-default-50/50 px-3 text-small"
            value={sessionId}
            onChange={(event) => {
              setSessionId(event.target.value);
              setDraft(initial(event.target.value));
            }}
          >
            {sessions.map((option) => (
              <option key={option.id} value={option.id}>
                {formatDate(option.date)}
                {option.startTime ? ` ${option.startTime}` : ""}
                {option.topic ? ` · ${option.topic}` : ""}
                {option.isCancelled ? ` (${t("cancelled")})` : ""}
              </option>
            ))}
          </select>
        </label>
        {canEdit && session && !session.isCancelled ? (
          <Button variant="flat" startContent={<CheckCheck className="h-4 w-4" aria-hidden />} onPress={() => enrollments.forEach((enrollment) => set(enrollment.id, { status: "PRESENT" }))}>
            {t("allPresent")}
          </Button>
        ) : null}
      </div>
      {session?.isCancelled ? <p className="text-small text-warning-600">{t("sessionCancelled")}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-default-200 bg-content1">
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-default-200 text-left text-default-500">
              <th className="p-3">{t("student")}</th>
              <th className="p-3">{t("status")}</th>
              <th className="p-3">{t("note")}</th>
              <th className="p-3 text-right">{t("rate")}</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => {
              const entry = draft[enrollment.id];
              const summary = summaryById.get(enrollment.id);
              return (
                <tr key={enrollment.id} className="border-b border-default-100 last:border-none">
                  <td className="p-3">
                    <span className="font-medium">{enrollment.studentLabel}</span>
                    <span className="ml-2 font-mono text-tiny text-default-400">{enrollment.studentNumber}</span>
                  </td>
                  <td className="p-3">
                    <div role="radiogroup" aria-label={t("status")} className="flex flex-wrap gap-1">
                      {ATTENDANCE_STATUS_VALUES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          role="radio"
                          aria-checked={entry?.status === status}
                          disabled={!canEdit || session?.isCancelled}
                          onClick={() => set(enrollment.id, { status })}
                          className={cn(
                            "rounded-medium border px-2 py-1 text-tiny font-medium transition-colors disabled:opacity-60",
                            entry?.status === status ? STATUS_STYLE[status] : "border-default-200 text-default-600 hover:bg-default-100",
                          )}
                        >
                          {tStatus(status)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      size="sm"
                      aria-label={t("note")}
                      value={entry?.note ?? ""}
                      onValueChange={(note) => set(enrollment.id, { note })}
                      isDisabled={!canEdit || session?.isCancelled}
                      maxLength={200}
                    />
                  </td>
                  <td className="p-3 text-right">
                    {summary?.rate === null || summary === undefined ? "—" : `${summary.rate}%`}
                    {summary && summary.recorded > 0 ? <span className="ml-1 text-tiny text-default-400">({summary.recorded})</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canEdit && !session?.isCancelled ? (
        <Button color="primary" className="self-start" isLoading={busy} onPress={save}>
          {t("save")}
        </Button>
      ) : null}
      <p className="text-tiny text-default-500">{t("rateHelp")}</p>
    </section>
  );
}
