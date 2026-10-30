import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";

import { ActionError, requireUser, UnauthorizedError } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { progressPermissions } from "../permissions";
import { ReportDocument } from "../pdf/report-document";
import { getAttendanceMap, listAssessments, listNotes, summarizeAttendance } from "../queries/progress";
import { loadRosterFor } from "./access";

/** GET /api/progress/report?courseId=…&enrollmentId=…&lang=de|tr — veli raporu (PDF, tarayıcıda açılır). */
export async function progressReportHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }
  if (!can(user.role, progressPermissions, "view")) {
    return Response.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? "";
  const enrollmentId = url.searchParams.get("enrollmentId") ?? "";

  let roster;
  try {
    roster = await loadRosterFor(user, courseId);
  } catch (error) {
    if (error instanceof ActionError) return Response.json({ ok: false, error: await translateMessage(error.message) }, { status: 404 });
    throw error;
  }
  const enrollment = roster.enrollments.find((candidate) => candidate.id === enrollmentId);
  if (!enrollment) return Response.json({ ok: false, error: await translateMessage("progress.errors.enrollmentNotFound") }, { status: 404 });

  const [attendance, assessments, notes, profile, logoDataUri] = await Promise.all([
    getAttendanceMap(courseId),
    listAssessments(courseId),
    listNotes(courseId, enrollmentId),
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);
  const activeSessions = roster.sessions.filter((session) => !session.isCancelled).map((session) => session.id);
  const [summary] = summarizeAttendance(attendance, [enrollmentId], activeSessions);

  registerSharedPdfFonts();
  const lang = resolvePdfLang(request);
  const buffer = await renderToBuffer(
    <ReportDocument
      data={{
        lang,
        organization: { ...profile, logoDataUri },
        generatedAt: new Date(),
        student: { name: enrollment.studentLabel, number: enrollment.studentNumber },
        course: { code: roster.course.code, title: roster.course.title, startDate: roster.course.startDate, endDate: roster.course.endDate, teachers: roster.teacherNames },
        attendance: summary,
        grades: assessments
          .filter((assessment) => assessment.grades[enrollmentId])
          .map((assessment) => ({
            date: assessment.date,
            title: assessment.title,
            type: assessment.type,
            maxPoints: assessment.maxPoints,
            ...assessment.grades[enrollmentId],
          })),
        notes: notes.map((note) => ({ date: note.date, rating: note.rating, text: note.text, goals: note.goals })),
      }}
    />,
  );
  const filename = `${lang === "de" ? "lernstandsbericht" : "gelisim-raporu"}-${enrollment.studentNumber}-${roster.course.code}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
