"use client";
import {
  toast,
  Button,
  Spinner,
  TextField,
  Label,
  Input,
  TextArea,
} from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatDate } from "@/shared/utils";

import {
  createNoteAction,
  deleteNoteAction,
} from "../actions/progress-actions";
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
  const [draft, setDraft] = useState({
    date: today,
    rating: "",
    text: "",
    goals: "",
  });
  const [busy, setBusy] = useState(false);

  if (enrollments.length === 0)
    return <p className="text-sm text-ink-500">{t("noStudents")}</p>;
  const visible = notes.filter((note) => note.enrollmentId === enrollmentId);

  const save = async () => {
    setBusy(true);
    const result = await createNoteAction({ courseId, enrollmentId, ...draft });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors)[0]?.[0]
        : undefined;
      toast(fieldError ?? result.error, { variant: "danger" });
      return;
    }
    toast(t("saved"), { variant: "success" });
    setDraft({ date: today, rating: "", text: "", goals: "" });
    router.refresh();
  };

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
      <ul className="flex flex-col gap-1" aria-label={t("students")}>
        {enrollments.map((enrollment) => {
          const count = notes.filter(
            (note) => note.enrollmentId === enrollment.id,
          ).length;
          return (
            <li key={enrollment.id}>
              <button
                type="button"
                onClick={() => setEnrollmentId(enrollment.id)}
                aria-current={
                  enrollment.id === enrollmentId ? "true" : undefined
                }
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${enrollment.id === enrollmentId ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "hover:bg-ink-100"}`}
              >
                <span className="truncate">{enrollment.studentLabel}</span>
                <span className="text-xs text-ink-400">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-4">
        {canEdit ? (
          <div className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-surface p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TextField
                value={draft.date}
                onChange={(date) => setDraft({ ...draft, date })}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("date")}</Label>
                <Input type="date" placeholder=" " />
              </TextField>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t("rating")}</span>
                <select
                  className="h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-2 text-sm"
                  value={draft.rating}
                  onChange={(event) =>
                    setDraft({ ...draft, rating: event.target.value })
                  }
                >
                  <option value="">—</option>
                  {["1", "2", "3", "4", "5"].map((value) => (
                    <option key={value} value={value}>
                      {value} · {t(`ratingLabel.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TextField
              value={draft.text}
              isRequired
              onChange={(text) => setDraft({ ...draft, text })}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{t("text")}</Label>
              <TextArea
                maxLength={2000}
                rows={2}
                className={["[field-sizing:content]"].filter(Boolean).join(" ")}
              />
            </TextField>
            <TextField
              value={draft.goals}
              onChange={(goals) => setDraft({ ...draft, goals })}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{t("goals")}</Label>
              <TextArea
                maxLength={1000}
                rows={1}
                className={["[field-sizing:content]"].filter(Boolean).join(" ")}
              />
            </TextField>
            <Button
              className="self-start"
              isDisabled={draft.text.trim().length < 3}
              onPress={save}
              variant={actionVariant("primary", "solid")}
              isPending={busy}
            >
              {busy ? <Spinner size="sm" color="current" /> : null}
              {t("add")}
            </Button>
          </div>
        ) : null}
        {visible.length === 0 ? (
          <p className="text-sm text-ink-500">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-1 rounded-lg border border-ink-200 bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-500">
                    {formatDate(note.date)} ·{" "}
                    {note.authorLabel.replace(/\s*<.*>$/, "")}
                  </span>
                  <div className="flex items-center gap-2">
                    {note.rating ? (
                      <span
                        className="flex items-center gap-0.5 text-warning-500"
                        aria-label={t("ratingAria", { rating: note.rating })}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            className={`h-3.5 w-3.5 ${index < note.rating! ? "fill-current" : "opacity-30"}`}
                            aria-hidden
                          />
                        ))}
                      </span>
                    ) : null}
                    {canEdit &&
                    (canDeleteAnyNote || note.authorId === currentUserId) ? (
                      <Button
                        isIconOnly
                        size="sm"
                        aria-label={t("delete")}
                        onPress={async () => {
                          const result = await deleteNoteAction({
                            id: note.id,
                          });
                          if (!result.ok) {
                            toast(result.error, { variant: "danger" });
                            return;
                          }
                          router.refresh();
                        }}
                        variant={actionVariant("danger", "light")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm">{note.text}</p>
                {note.goals ? (
                  <p className="text-sm text-ink-600">
                    <span className="font-medium">{t("goals")}:</span>{" "}
                    {note.goals}
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
