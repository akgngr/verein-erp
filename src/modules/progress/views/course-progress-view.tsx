import { FileDown } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ActionError, ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";
import { cn } from "@/shared/utils";

import { AttendancePanel } from "../components/attendance-panel";
import { GradesPanel } from "../components/grades-panel";
import { NotesPanel } from "../components/notes-panel";
import { progressNotesAllPermissions, progressPermissions } from "../permissions";
import { getAttendanceMap, listAssessments, listNotes, summarizeAttendance } from "../queries/progress";
import { loadRosterFor } from "../services/access";

const TABS = ["yoklama", "notlar", "gelisim", "rapor"] as const;

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export async function CourseProgressView({ courseId, searchParams }: { courseId: string; searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(progressPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  let roster;
  try {
    roster = await loadRosterFor(user, courseId);
  } catch (error) {
    if (error instanceof ActionError) notFound();
    throw error;
  }
  const t = await getTranslations("progress");
  const raw = await searchParams;
  const tab = TABS.find((candidate) => candidate === raw.sekme) ?? "yoklama";
  const canEdit = can(user.role, progressPermissions, "update");
  const enrollments = roster.enrollments.filter((enrollment) => enrollment.status !== "WITHDRAWN");
  const today = todayIso();

  let body: React.ReactNode;
  if (tab === "yoklama") {
    const attendance = await getAttendanceMap(courseId);
    const active = roster.sessions.filter((session) => !session.isCancelled).map((session) => session.id);
    const past = roster.sessions.filter((session) => session.date.toISOString().slice(0, 10) <= today);
    const defaultSession = past.at(-1) ?? roster.sessions[0] ?? null;
    body = (
      <AttendancePanel
        courseId={courseId}
        sessions={roster.sessions}
        enrollments={enrollments}
        attendance={attendance}
        summaries={summarizeAttendance(attendance, enrollments.map((enrollment) => enrollment.id), active)}
        defaultSessionId={defaultSession?.id ?? null}
        canEdit={canEdit}
      />
    );
  } else if (tab === "notlar") {
    body = <GradesPanel courseId={courseId} assessments={await listAssessments(courseId)} enrollments={enrollments} today={today} canEdit={canEdit} />;
  } else if (tab === "gelisim") {
    body = (
      <NotesPanel
        courseId={courseId}
        enrollments={enrollments}
        notes={await listNotes(courseId)}
        today={today}
        canEdit={can(user.role, progressPermissions, "create")}
        currentUserId={user.id}
        canDeleteAnyNote={can(user.role, progressNotesAllPermissions, "delete")}
      />
    );
  } else {
    body =
      roster.enrollments.length === 0 ? (
        <p className="text-small text-default-500">{t("report.noStudents")}</p>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-small text-default-500">{t("report.help")}</p>
          <ul className="flex flex-col gap-2">
            {roster.enrollments.map((enrollment) => (
              <li key={enrollment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-default-200 bg-content1 p-3">
                <span className="text-small font-medium">
                  {enrollment.studentLabel} <span className="font-mono text-tiny text-default-400">{enrollment.studentNumber}</span>
                </span>
                <span className="flex gap-2">
                  {(["de", "tr"] as const).map((lang) => (
                    <a
                      key={lang}
                      href={`/api/progress/report?courseId=${courseId}&enrollmentId=${enrollment.id}&lang=${lang}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 rounded-medium border border-default-200 px-2 py-1 text-tiny hover:bg-default-100"
                    >
                      <FileDown className="h-3.5 w-3.5" aria-hidden />
                      {t(`report.pdf.${lang}`)}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`${roster.course.code} — ${roster.course.title}`} description={roster.teacherNames.join(", ") || t("noTeacher")} />
      <nav className="flex gap-1 border-b border-default-200" aria-label={t("tabs")}>
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/ogrenci-takibi/${courseId}?sekme=${key}`}
            className={cn("-mb-px border-b-2 px-3 py-2 text-small", key === tab ? "border-primary font-semibold text-primary" : "border-transparent text-default-600 hover:text-foreground")}
          >
            {t(`tab.${key}`)}
          </Link>
        ))}
      </nav>
      {body}
    </div>
  );
}
