"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Label, TextArea, TextField } from "@/shared/components/kit";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { formatDateTime } from "@/shared/utils";

import { addMemberNoteAction } from "../actions/add-note";
import type { MemberNoteItem } from "../types";

/**
 * İşlem notları bölümü: ekleme formu (update yetkisi varsa) + kronolojik akış.
 * documents ile aynı kalıp — notlar salt eklenir, düzenleme/silme yoktur.
 */
export function NotesTimeline({
  memberId,
  notes,
  canUpdate,
}: {
  memberId: string;
  notes: MemberNoteItem[];
  canUpdate: boolean;
}) {
  const t = useTranslations("members");

  return (
    <div className="flex flex-col gap-4">
      {canUpdate ? <NoteForm memberId={memberId} /> : null}
      {notes.length === 0 ? (
        <p className="text-sm text-ink-500">{t("detail.noNotes")}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-ink-200 bg-surface px-4 py-3"
            >
              <p className="text-xs text-ink-500">
                <span className="font-medium text-ink-700">
                  {note.authorLabel}
                </span>{" "}
                — {formatDateTime(note.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {note.body}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NoteForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const t = useTranslations("members");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await addMemberNoteAction({ memberId, body });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    notify.success(t("notes.addedToast"));
    router.refresh();
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit} noValidate>
      <TextField
        value={body}
        onChange={setBody}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("detail.newNote")}</Label>
        <TextArea
          placeholder={t("detail.notePlaceholder")}
          maxLength={2000}
          rows={3}
          className={["[field-sizing:content]"].filter(Boolean).join(" ")}
        />
        <Description>{`${body.length}/2000`}</Description>
      </TextField>
      <FormErrorSummary message={error} />
      <div>
        <SubmitButton isSubmitting={isSubmitting}>
          {t("detail.addNote")}
        </SubmitButton>
      </div>
    </form>
  );
}
