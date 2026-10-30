"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import { createAssessmentAction, deleteAssessmentAction, saveGradesAction } from "../actions/progress-actions";
import { ASSESSMENT_TYPE_VALUES } from "../constants";
import type { AssessmentRow, ProgressAssessmentType } from "../types";

type Enrollment = { id: string; studentLabel: string; studentNumber: string };
type Draft = Record<string, { points: string; grade: string; comment: string }>;

function toDraft(assessment: AssessmentRow | undefined, enrollments: Enrollment[]): Draft {
  return Object.fromEntries(
    enrollments.map((enrollment) => {
      const grade = assessment?.grades[enrollment.id];
      return [enrollment.id, { points: grade?.points === null || grade?.points === undefined ? "" : String(grade.points).replace(".", ","), grade: grade?.grade ?? "", comment: grade?.comment ?? "" }];
    }),
  );
}

/** Sınav/ödev listesi; seçilen değerlendirme için öğrenci başına puan, not (1–6) ve yorum girilir. */
export function GradesPanel({ courseId, assessments, enrollments, today, canEdit }: { courseId: string; assessments: AssessmentRow[]; enrollments: Enrollment[]; today: string; canEdit: boolean }) {
  const t = useTranslations("progress.grades");
  const tType = useTranslations("progress.assessmentType");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(assessments.at(-1)?.id ?? "");
  const selected = assessments.find((assessment) => assessment.id === selectedId);
  const [draft, setDraft] = useState<Draft>(() => toDraft(selected, enrollments));
  const [creating, setCreating] = useState<{ title: string; date: string; type: ProgressAssessmentType; maxPoints: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (id: string) => {
    setSelectedId(id);
    setDraft(toDraft(assessments.find((assessment) => assessment.id === id), enrollments));
  };

  const saveGrades = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await saveGradesAction({ assessmentId: selected.id, entries: enrollments.map((enrollment) => ({ enrollmentId: enrollment.id, ...draft[enrollment.id] })) });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      addToast({ title: fieldError ?? result.error, color: "danger" });
      return;
    }
    addToast({ title: t("saved"), color: "success" });
    router.refresh();
  };

  const create = async () => {
    if (!creating) return;
    setBusy(true);
    setError(null);
    const result = await createAssessmentAction({ courseId, ...creating });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      setError(fieldError ?? result.error);
      return;
    }
    setCreating(null);
    setSelectedId(result.data.id);
    setDraft(toDraft(undefined, enrollments));
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        {assessments.length > 0 ? (
          <label className="flex min-w-64 flex-col gap-1 text-small">
            <span className="font-medium">{t("assessment")}</span>
            <select className="h-10 rounded-medium border border-default-200 bg-default-50/50 px-3 text-small" value={selectedId} onChange={(event) => choose(event.target.value)}>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {formatDate(assessment.date)} · {assessment.title} ({tType(assessment.type)})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {canEdit ? (
          <Button color="primary" variant={assessments.length > 0 ? "flat" : "solid"} startContent={<Plus className="h-4 w-4" aria-hidden />} onPress={() => setCreating({ title: "", date: today, type: "EXAM", maxPoints: "" })}>
            {t("add")}
          </Button>
        ) : null}
        {canEdit && selected ? (
          <Button variant="light" color="danger" startContent={<Trash2 className="h-4 w-4" aria-hidden />} onPress={() => setDeleting(true)}>
            {t("delete")}
          </Button>
        ) : null}
      </div>

      {!selected ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : enrollments.length === 0 ? (
        <p className="text-small text-default-500">{t("noStudents")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-default-200 bg-content1">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-default-200 text-left text-default-500">
                  <th className="p-3">{t("student")}</th>
                  <th className="p-3">{selected.maxPoints !== null ? t("pointsOf", { max: selected.maxPoints }) : t("points")}</th>
                  <th className="p-3">{t("grade")}</th>
                  <th className="p-3">{t("comment")}</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-default-100 last:border-none">
                    <td className="p-3 font-medium">{enrollment.studentLabel}</td>
                    {(["points", "grade", "comment"] as const).map((field) => (
                      <td key={field} className="p-3">
                        <Input
                          size="sm"
                          aria-label={t(field)}
                          value={draft[enrollment.id]?.[field] ?? ""}
                          onValueChange={(value) => setDraft((current) => ({ ...current, [enrollment.id]: { ...current[enrollment.id], [field]: value } }))}
                          isDisabled={!canEdit}
                          className={field === "comment" ? "min-w-48" : "w-24"}
                          maxLength={field === "comment" ? 300 : 8}
                          placeholder={field === "grade" ? "1–6" : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit ? (
            <Button color="primary" className="self-start" isLoading={busy} onPress={saveGrades}>
              {t("save")}
            </Button>
          ) : null}
          <p className="text-tiny text-default-500">{t("gradeHelp")}</p>
        </>
      )}

      <Modal isOpen={creating !== null} onOpenChange={(open) => !open && setCreating(null)}>
        <ModalContent>
          <ModalHeader>{t("addTitle")}</ModalHeader>
          <ModalBody>
            {creating ? (
              <div className="flex flex-col gap-3">
                <Input label={t("title")} labelPlacement="outside" placeholder=" " value={creating.title} onValueChange={(title) => setCreating({ ...creating, title })} isRequired maxLength={120} />
                <div className="grid grid-cols-3 gap-3">
                  <Input type="date" label={t("date")} labelPlacement="outside" placeholder=" " value={creating.date} onValueChange={(date) => setCreating({ ...creating, date })} />
                  <label className="flex flex-col gap-1 text-small">
                    <span>{t("type")}</span>
                    <select className="h-10 rounded-medium border border-default-200 bg-default-50/50 px-2 text-small" value={creating.type} onChange={(event) => setCreating({ ...creating, type: event.target.value as ProgressAssessmentType })}>
                      {ASSESSMENT_TYPE_VALUES.map((type) => (
                        <option key={type} value={type}>
                          {tType(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input label={t("maxPoints")} labelPlacement="outside" placeholder=" " value={creating.maxPoints} onValueChange={(maxPoints) => setCreating({ ...creating, maxPoints })} />
                </div>
                {error ? <p className="text-small text-danger">{error}</p> : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setCreating(null)}>
              {tCommon("cancel")}
            </Button>
            <Button color="primary" isLoading={busy} onPress={create}>
              {tCommon("save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ConfirmDialog
        isOpen={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle")}
        message={selected ? t("deleteMessage", { title: selected.title }) : ""}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!selected) return;
          const result = await deleteAssessmentAction({ id: selected.id });
          if (!result.ok) {
            addToast({ title: result.error, color: "danger" });
            return;
          }
          setDeleting(false);
          setSelectedId("");
          router.refresh();
        }}
      />
    </section>
  );
}
