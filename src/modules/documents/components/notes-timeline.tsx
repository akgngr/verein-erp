"use client";
import { toast, TextField, Label, TextArea, Description } from "@heroui/react";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { formatDateTime } from "@/shared/utils";

import { addNoteAction } from "../actions/add-note";
import type { DocumentNoteItem } from "../types";

/**
 * İşlem notları bölümü (8.3): ekleme formu (update yetkisi varsa) + kronolojik
 * akış (en yeni üstte). Notlar salt eklenir — düzenleme/silme yoktur.
 */
export function NotesTimeline({
  documentId,
  notes,
  canUpdate,
}: {
  documentId: string;
  notes: DocumentNoteItem[];
  canUpdate: boolean;
}) {
  const t = useTranslations("documents.notes");
  return (
    <div className="flex flex-col gap-4">
      {canUpdate ? <NoteForm documentId={documentId} /> : null}
      {notes.length === 0 ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
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

function NoteForm({ documentId }: { documentId: string }) {
  const t = useTranslations("documents.notes");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await addNoteAction({ documentId, body });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    toast(t("addedToast"), { variant: "success" });
    router.refresh();
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit} noValidate>
      <TextField
        value={body}
        onChange={setBody}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("newNote")}</Label>
        <TextArea
          placeholder={t("notePlaceholder")}
          maxLength={2000}
          rows={3}
          className={["[field-sizing:content]"].filter(Boolean).join(" ")}
        />
        <Description>{`${body.length}/2000`}</Description>
      </TextField>
      <FormErrorSummary message={error} />
      <div>
        <SubmitButton isSubmitting={isSubmitting}>{t("add")}</SubmitButton>
      </div>
    </form>
  );
}
