"use client";
import { Button, toast } from "@heroui/react";
import { Dialog, Input, Label, Spinner, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import {
  createAssessmentAction,
  deleteAssessmentAction,
  saveGradesAction,
} from "../actions/progress-actions";
import { ASSESSMENT_TYPE_VALUES } from "../constants";
import type { AssessmentRow, ProgressAssessmentType } from "../types";

type Enrollment = { id: string; studentLabel: string; studentNumber: string };
type Draft = Record<string, { points: string; grade: string; comment: string }>;

function toDraft(
  assessment: AssessmentRow | undefined,
  enrollments: Enrollment[],
): Draft {
  return Object.fromEntries(
    enrollments.map((enrollment) => {
      const grade = assessment?.grades[enrollment.id];
      return [
        enrollment.id,
        {
          points:
            grade?.points === null || grade?.points === undefined
              ? ""
              : String(grade.points).replace(".", ","),
          grade: grade?.grade ?? "",
          comment: grade?.comment ?? "",
        },
      ];
    }),
  );
}

/** Sınav/ödev listesi; seçilen değerlendirme için öğrenci başına puan, not (1–6) ve yorum girilir. */
export function GradesPanel({
  courseId,
  assessments,
  enrollments,
  today,
  canEdit,
}: {
  courseId: string;
  assessments: AssessmentRow[];
  enrollments: Enrollment[];
  today: string;
  canEdit: boolean;
}) {
  const t = useTranslations("progress.grades");
  const tType = useTranslations("progress.assessmentType");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(assessments.at(-1)?.id ?? "");
  const selected = assessments.find(
    (assessment) => assessment.id === selectedId,
  );
  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(selected, enrollments),
  );
  const [creating, setCreating] = useState<{
    title: string;
    date: string;
    type: ProgressAssessmentType;
    maxPoints: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (id: string) => {
    setSelectedId(id);
    setDraft(
      toDraft(
        assessments.find((assessment) => assessment.id === id),
        enrollments,
      ),
    );
  };

  const saveGrades = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await saveGradesAction({
      assessmentId: selected.id,
      entries: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        ...draft[enrollment.id],
      })),
    });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors)[0]?.[0]
        : undefined;
      toast(fieldError ?? result.error, { variant: "danger" });
      return;
    }
    toast(t("saved"), { variant: "success" });
    router.refresh();
  };

  const create = async () => {
    if (!creating) return;
    setBusy(true);
    setError(null);
    const result = await createAssessmentAction({ courseId, ...creating });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors)[0]?.[0]
        : undefined;
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
          <label className="flex min-w-64 flex-col gap-1 text-sm">
            <span className="font-medium">{t("assessment")}</span>
            <select
              className="h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-3 text-sm"
              value={selectedId}
              onChange={(event) => choose(event.target.value)}
            >
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {formatDate(assessment.date)} · {assessment.title} (
                  {tType(assessment.type)})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {canEdit ? (
          <Button
            onPress={() =>
              setCreating({
                title: "",
                date: today,
                type: "EXAM",
                maxPoints: "",
              })
            }
            variant={actionVariant(
              "primary",
              assessments.length > 0 ? "flat" : "solid",
            )}
          >
            {<Plus className="h-4 w-4" aria-hidden />}
            {t("add")}
          </Button>
        ) : null}
        {canEdit && selected ? (
          <Button
            onPress={() => setDeleting(true)}
            variant={actionVariant("danger", "light")}
          >
            {<Trash2 className="h-4 w-4" aria-hidden />}
            {t("delete")}
          </Button>
        ) : null}
      </div>

      {!selected ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : enrollments.length === 0 ? (
        <p className="text-sm text-ink-500">{t("noStudents")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-ink-500">
                  <th className="p-3">{t("student")}</th>
                  <th className="p-3">
                    {selected.maxPoints !== null
                      ? t("pointsOf", { max: selected.maxPoints })
                      : t("points")}
                  </th>
                  <th className="p-3">{t("grade")}</th>
                  <th className="p-3">{t("comment")}</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-ink-100 last:border-none"
                  >
                    <td className="p-3 font-medium">
                      {enrollment.studentLabel}
                    </td>
                    {(["points", "grade", "comment"] as const).map((field) => (
                      <td key={field} className="p-3">
                        <TextField
                          aria-label={t(field)}
                          value={draft[enrollment.id]?.[field] ?? ""}
                          isDisabled={!canEdit}
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              [enrollment.id]: {
                                ...current[enrollment.id],
                                [field]: value,
                              },
                            }))
                          }
                          className={[field === "comment" ? "min-w-48" : "w-24"]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <Input
                            maxLength={field === "comment" ? 300 : 8}
                            placeholder={field === "grade" ? "1–6" : undefined}
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit ? (
            <Button
              className="self-start"
              onPress={saveGrades}
              variant={actionVariant("primary", "solid")}
              isPending={busy}
            >
              {busy ? <Spinner size="sm" tone="current" /> : null}
              {t("save")}
            </Button>
          ) : null}
          <p className="text-xs text-ink-500">{t("gradeHelp")}</p>
        </>
      )}

      <Dialog
        isOpen={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("addTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {creating ? (
                  <div className="flex flex-col gap-3">
                    <TextField
                      value={creating.title}
                      isRequired
                      onChange={(title) => setCreating({ ...creating, title })}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("title")}</Label>
                      <Input placeholder=" " maxLength={120} />
                    </TextField>
                    <div className="grid grid-cols-3 gap-3">
                      <TextField
                        value={creating.date}
                        onChange={(date) => setCreating({ ...creating, date })}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("date")}</Label>
                        <Input type="date" placeholder=" " />
                      </TextField>
                      <label className="flex flex-col gap-1 text-sm">
                        <span>{t("type")}</span>
                        <select
                          className="h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-2 text-sm"
                          value={creating.type}
                          onChange={(event) =>
                            setCreating({
                              ...creating,
                              type: event.target
                                .value as ProgressAssessmentType,
                            })
                          }
                        >
                          {ASSESSMENT_TYPE_VALUES.map((type) => (
                            <option key={type} value={type}>
                              {tType(type)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <TextField
                        value={creating.maxPoints}
                        onChange={(maxPoints) =>
                          setCreating({ ...creating, maxPoints })
                        }
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("maxPoints")}</Label>
                        <Input placeholder=" " />
                      </TextField>
                    </div>
                    {error ? (
                      <p className="text-sm text-danger">{error}</p>
                    ) : null}
                  </div>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setCreating(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={create}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {tCommon("save")}
                </Button>
              </Dialog.Footer>
      </Dialog>
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
            toast(result.error, { variant: "danger" });
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
