"use client";

import { addToast, Button, Input, Textarea } from "@heroui/react";
import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatDate } from "@/shared/utils";

import { createNoteAction, deleteNoteAction } from "../actions/progress-actions";
import type { NoteRow } from "../types";

type Enrollment = { id: string; studentLabel: string; studentNumber: string };

/** Öğrenci seçilir; tarihli gelişim notları (1–5 değerlendirme, hedefler) eklenir ve listelenir. */
export function NotesPanel({
  courseId,
  enrollments,
  notes,
  today,
  canEdit,
  currentUserId,
  canDeleteAnyNote,
}: {
  courseId: string;
  enrollments: Enrollment[];
  notes: NoteRow[];
  today: string;
  canEdit: boolean;
  currentUserId: string;
  canDeleteAnyNote: boolean;
}) {
  const t = useTranslations("progress.notes");
  const router = useRouter();
  const [enrollmentId, setEnrollmentId] = useState(enrollments[0]?.id ?? "");
  const [draft, setDraft] = useState({ date: today, rating: "", text: "", goals: "" });
  const [busy, setBusy] = useState(false);

  if (enrollments.length === 0) return <p className="text-small text-default-500">{t("noStudents")}</p>;
  const visible = notes.filter((note) => note.enrollmentId === enrollmentId);

  const save = async () => {
    setBusy(true);
    const result = await createNoteAction({ courseId, enrollmentId, ...draft });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      addToast({ title: fieldError ?? result.error, color: "danger" });
      return;
    }
    addToast({ title: t("saved"), color: "success" });
    setDraft({ date: today, rating: "", text: "", goals: "" });
    router.refresh();
  };

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
      <ul className="flex flex-col gap-1" aria-label={t("students")}>
        {enrollments.map((enrollment) => {
          const count = notes.filter((note) => note.enrollmentId === enrollment.id).length;
          return (
            <li key={enrollment.id}>
              <button
                type="button"
                onClick={() => setEnrollmentId(enrollment.id)}
                aria-current={enrollment.id === enrollmentId ? "true" : undefined}
                className={`flex w-full items-center justify-between rounded-medium px-3 py-2 text-left text-small ${enrollment.id === enrollmentId ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300" : "hover:bg-default-100"}`}
              >
                <span className="truncate">{enrollment.studentLabel}</span>
                <span className="text-tiny text-default-400">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-4">
        {canEdit ? (
          <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-content1 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input type="date" label={t("date")} labelPlacement="outside" placeholder=" " value={draft.date} onValueChange={(date) => setDraft({ ...draft, date })} />
              <label className="flex flex-col gap-1 text-small">
                <span>{t("rating")}</span>
                <select className="h-10 rounded-medium border border-default-200 bg-default-50/50 px-2 text-small" value={draft.rating} onChange={(event) => setDraft({ ...draft, rating: event.target.value })}>
                  <option value="">—</option>
                  {["1", "2", "3", "4", "5"].map((value) => (
                    <option key={value} value={value}>
                      {value} · {t(`ratingLabel.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Textarea label={t("text")} labelPlacement="outside" value={draft.text} onValueChange={(text) => setDraft({ ...draft, text })} minRows={2} maxLength={2000} isRequired />
            <Textarea label={t("goals")} labelPlacement="outside" value={draft.goals} onValueChange={(goals) => setDraft({ ...draft, goals })} minRows={1} maxLength={1000} />
            <Button color="primary" className="self-start" isLoading={busy} isDisabled={draft.text.trim().length < 3} onPress={save}>
              {t("add")}
            </Button>
          </div>
        ) : null}
        {visible.length === 0 ? (
          <p className="text-small text-default-500">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((note) => (
              <li key={note.id} className="flex flex-col gap-1 rounded-medium border border-default-200 bg-content1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-tiny text-default-500">
                    {formatDate(note.date)} · {note.authorLabel.replace(/\s*<.*>$/, "")}
                  </span>
                  <div className="flex items-center gap-2">
                    {note.rating ? (
                      <span className="flex items-center gap-0.5 text-warning-500" aria-label={t("ratingAria", { rating: note.rating })}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star key={index} className={`h-3.5 w-3.5 ${index < note.rating! ? "fill-current" : "opacity-30"}`} aria-hidden />
                        ))}
                      </span>
                    ) : null}
                    {canEdit && (canDeleteAnyNote || note.authorId === currentUserId) ? (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        aria-label={t("delete")}
                        onPress={async () => {
                          const result = await deleteNoteAction({ id: note.id });
                          if (!result.ok) {
                            addToast({ title: result.error, color: "danger" });
                            return;
                          }
                          router.refresh();
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-line text-small">{note.text}</p>
                {note.goals ? (
                  <p className="text-small text-default-600">
                    <span className="font-medium">{t("goals")}:</span> {note.goals}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
