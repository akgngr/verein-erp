"use client";
import { toast, Button, Spinner, TextField, Input } from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatDate } from "@/shared/utils";
import { cn } from "@/shared/utils";

import { saveAttendanceAction } from "../actions/progress-actions";
import { ATTENDANCE_STATUS_VALUES } from "../constants";
import type {
  AttendanceMap,
  AttendanceSummary,
  ProgressAttendanceStatus,
} from "../types";

const STATUS_STYLE: Record<ProgressAttendanceStatus, string> = {
  PRESENT:
    "bg-success-100 text-success-700 border-success-300 dark:bg-success-500/20 dark:text-success-300",
  LATE: "bg-warning-100 text-warning-700 border-warning-300 dark:bg-warning-500/20 dark:text-warning-300",
  EXCUSED:
    "bg-brand-100 text-brand-700 border-brand-300 dark:bg-brand-500/20 dark:text-brand-300",
  ABSENT:
    "bg-danger-100 text-danger-700 border-danger-300 dark:bg-danger-500/20 dark:text-danger-300",
};

type Session = {
  id: string;
  date: Date;
  startTime: string | null;
  topic: string | null;
  isCancelled: boolean;
};
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
  const [draft, setDraft] = useState<
    Record<string, { status: ProgressAttendanceStatus | null; note: string }>
  >(() => initial(defaultSessionId));
  const [busy, setBusy] = useState(false);

  function initial(id: string | null) {
    const existing = id ? (attendance[id] ?? {}) : {};
    return Object.fromEntries(
      enrollments.map((enrollment) => [
        enrollment.id,
        {
          status: existing[enrollment.id]?.status ?? null,
          note: existing[enrollment.id]?.note ?? "",
        },
      ]),
    );
  }

  if (sessions.length === 0)
    return <p className="text-sm text-ink-500">{t("noSessions")}</p>;
  if (enrollments.length === 0)
    return <p className="text-sm text-ink-500">{t("noStudents")}</p>;

  const set = (
    enrollmentId: string,
    patch: Partial<{ status: ProgressAttendanceStatus | null; note: string }>,
  ) =>
    setDraft((current) => ({
      ...current,
      [enrollmentId]: { ...current[enrollmentId], ...patch },
    }));

  const save = async () => {
    const entries = enrollments
      .filter((enrollment) => draft[enrollment.id]?.status)
      .map((enrollment) => ({
        enrollmentId: enrollment.id,
        status: draft[enrollment.id].status,
        note: draft[enrollment.id].note,
      }));
    if (entries.length === 0) return;
    setBusy(true);
    const result = await saveAttendanceAction({ courseId, sessionId, entries });
    setBusy(false);
    if (!result.ok) {
      toast(result.error, { variant: "danger" });
      return;
    }
    toast(t("saved", { count: result.data.saved }), { variant: "success" });
    router.refresh();
  };

  const summaryById = new Map(
    summaries.map((summary) => [summary.enrollmentId, summary]),
  );
  const session = sessions.find((candidate) => candidate.id === sessionId);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-col gap-1 text-sm">
          <span className="font-medium">{t("session")}</span>
          <select
            className="h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-3 text-sm"
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
          <Button
            onPress={() =>
              enrollments.forEach((enrollment) =>
                set(enrollment.id, { status: "PRESENT" }),
              )
            }
            variant={actionVariant("default", "flat")}
          >
            {<CheckCheck className="h-4 w-4" aria-hidden />}
            {t("allPresent")}
          </Button>
        ) : null}
      </div>
      {session?.isCancelled ? (
        <p className="text-sm text-warning-600">{t("sessionCancelled")}</p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-ink-500">
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
                <tr
                  key={enrollment.id}
                  className="border-b border-ink-100 last:border-none"
                >
                  <td className="p-3">
                    <span className="font-medium">
                      {enrollment.studentLabel}
                    </span>
                    <span className="ml-2 font-mono text-xs text-ink-400">
                      {enrollment.studentNumber}
                    </span>
                  </td>
                  <td className="p-3">
                    <div
                      role="radiogroup"
                      aria-label={t("status")}
                      className="flex flex-wrap gap-1"
                    >
                      {ATTENDANCE_STATUS_VALUES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          role="radio"
                          aria-checked={entry?.status === status}
                          disabled={!canEdit || session?.isCancelled}
                          onClick={() => set(enrollment.id, { status })}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                            entry?.status === status
                              ? STATUS_STYLE[status]
                              : "border-ink-200 text-ink-600 hover:bg-ink-100",
                          )}
                        >
                          {tStatus(status)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <TextField
                      aria-label={t("note")}
                      value={entry?.note ?? ""}
                      isDisabled={!canEdit || session?.isCancelled}
                      onChange={(note) => set(enrollment.id, { note })}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Input
                        maxLength={200}
                        className={["h-9 text-sm"].filter(Boolean).join(" ")}
                      />
                    </TextField>
                  </td>
                  <td className="p-3 text-right">
                    {summary?.rate === null || summary === undefined
                      ? "—"
                      : `${summary.rate}%`}
                    {summary && summary.recorded > 0 ? (
                      <span className="ml-1 text-xs text-ink-400">
                        ({summary.recorded})
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canEdit && !session?.isCancelled ? (
        <Button
          className="self-start"
          onPress={save}
          variant={actionVariant("primary", "solid")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" color="current" /> : null}
          {t("save")}
        </Button>
      ) : null}
      <p className="text-xs text-ink-500">{t("rateHelp")}</p>
    </section>
  );
}
