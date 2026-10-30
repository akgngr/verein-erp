"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getDb } from "@/shared/db";
import { generatePassword } from "@/shared/security/generate-password";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { isMailConfigured, sendMail } from "@/modules/mail/server";
import { createUserAccount } from "@/modules/users/server";

import { courseTeachersPermissions } from "../permissions";
import { teacherInviteSchema, teacherSchema, teacherUpdateSchema, type TeacherInput } from "../schemas/teacher";

type InviteResult = { temporaryPassword: string; mailSent: boolean };

function teacherData(input: TeacherInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email ? input.email.toLowerCase() : null,
    phone: input.phone || null,
    subjects: input.subjects || null,
    note: input.note || null,
    isActive: input.isActive,
  };
}

async function loginUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}/giris`;
}

/**
 * Öğretmen için TEACHER rolünde giriş hesabı açar (geçici parola, ilk girişte değiştirme zorunlu)
 * ve e-posta altyapısı yapılandırılmışsa davet e-postası gönderir. Parola yalnızca bir kez,
 * daveti yapan kişiye gösterilir; hiçbir yerde saklanmaz.
 */
async function inviteTeacher(teacher: { id: string; firstName: string; lastName: string; email: string | null }): Promise<InviteResult> {
  if (!teacher.email) throw new ActionError("courses.validation.emailForInvite");
  const temporaryPassword = generatePassword();
  const name = `${teacher.firstName} ${teacher.lastName}`;
  const account = await createUserAccount({ name, email: teacher.email, role: "TEACHER", temporaryPassword });
  await getDb().courseTeacher.update({ where: { id: teacher.id }, data: { userId: account.id } });

  let mailSent = false;
  if (await isMailConfigured()) {
    const t = await getTranslations("courses.inviteMail");
    const url = await loginUrl();
    const result = await sendMail({
      to: teacher.email,
      toName: name,
      subject: t("subject"),
      text: t("body", { name, url, email: teacher.email, password: temporaryPassword }),
      context: { module: "courses", reference: teacher.id },
    });
    mailSent = result.ok;
  }
  return { temporaryPassword, mailSent };
}

export async function createTeacherAction(input: unknown): Promise<ActionResult<{ id: string; invite: InviteResult | null }>> {
  const run = createAction({
    permission: { definition: courseTeachersPermissions, action: "create" },
    schema: teacherSchema,
    handler: async ({ input, audit }) => {
      const created = await getDb().courseTeacher.create({ data: teacherData(input) });
      const invite = input.invite ? await inviteTeacher(created) : null;
      await audit({ action: "CREATE", entity: "CourseTeacher", entityId: created.id, after: { name: `${created.firstName} ${created.lastName}`, invited: Boolean(invite) } });
      return { id: created.id, invite };
    },
  });
  return run(input);
}

export async function updateTeacherAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: courseTeachersPermissions, action: "update" },
    schema: teacherUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.courseTeacher.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("courses.errors.teacherNotFound");
      await db.courseTeacher.update({ where: { id: existing.id }, data: teacherData(input) });
      await audit({ action: "UPDATE", entity: "CourseTeacher", entityId: existing.id, after: { isActive: input.isActive } });
      return { id: existing.id };
    },
  });
  return run(input);
}

/** Kaydı olan ama hesabı olmayan öğretmeni sonradan davet eder. */
export async function inviteTeacherAction(input: unknown): Promise<ActionResult<InviteResult>> {
  const run = createAction({
    permission: { definition: courseTeachersPermissions, action: "create" },
    schema: teacherInviteSchema,
    handler: async ({ input, audit }) => {
      const teacher = await getDb().courseTeacher.findUnique({ where: { id: input.id } });
      if (!teacher) throw new ActionError("courses.errors.teacherNotFound");
      if (teacher.userId) throw new ActionError("courses.errors.teacherHasAccount");
      const invite = await inviteTeacher(teacher);
      await audit({ action: "TEACHER_INVITE", entity: "CourseTeacher", entityId: teacher.id, after: { mailSent: invite.mailSent } });
      return invite;
    },
  });
  return run(input);
}
