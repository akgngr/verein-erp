import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDate } from "@/shared/utils";

import { GuardianLinksPanel } from "../components/guardian-links-panel";
import { StudentForm } from "../components/student-form";
import { studentsPermissions } from "../permissions";
import { listGuardianOptions } from "../queries/guardians";
import { getStudent } from "../queries/students";

export async function StudentDetailView({ id, editOpen }: { id: string; editOpen: boolean }) {
  let user;
  try {
    user = await requirePermission(studentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("students");
  const student = await getStudent(id);
  if (!student) notFound();
  const canUpdate = can(user.role, studentsPermissions, "update");
  const guardianOptions = canUpdate ? await listGuardianOptions() : [];

  const facts: [string, string][] = [
    [t("form.birthDate"), student.birthDate ? formatDate(student.birthDate) : "—"],
    [t("form.school"), [student.school, student.gradeLevel].filter(Boolean).join(" · ") || "—"],
    [t("form.email"), student.email ?? "—"],
    [t("form.phone"), student.phone ?? "—"],
    [t("form.status"), t(`status.${student.status}`)],
    [t("form.dataConsentAt"), student.dataConsentAt ? formatDate(student.dataConsentAt) : t("detail.noConsent")],
    [t("form.photoConsent"), student.photoConsent ? t("detail.yes") : t("detail.no")],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${student.studentNumber} · ${t("detail.createdBy", { label: student.createdByLabel })}`}
        actions={
          canUpdate ? (
            <FormDrawerButton param="duzenle" startIcon={<Pencil className="h-4 w-4" />}>
              {t("detail.edit")}
            </FormDrawerButton>
          ) : null
        }
      />
      <section className="grid grid-cols-1 gap-3 rounded-xl border border-default-200 bg-content1 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-tiny text-default-500">{label}</span>
            <span className="text-small font-medium">{value}</span>
          </div>
        ))}
        {student.note ? (
          <div className="flex flex-col sm:col-span-2 lg:col-span-3">
            <span className="text-tiny text-default-500">{t("form.note")}</span>
            <span className="whitespace-pre-line text-small">{student.note}</span>
          </div>
        ) : null}
      </section>
      <GuardianLinksPanel student={student} guardianOptions={guardianOptions} canUpdate={canUpdate} />
      {canUpdate && editOpen ? (
        <FormDrawer title={t("form.editTitle")} description={student.studentNumber}>
          <StudentForm student={student} />
        </FormDrawer>
      ) : null}
    </div>
  );
}
