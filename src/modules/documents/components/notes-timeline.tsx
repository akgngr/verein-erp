"use client";

import { Textarea, addToast } from "@heroui/react";
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
  return (
    <div className="flex flex-col gap-4">
      {canUpdate ? <NoteForm documentId={documentId} /> : null}
      {notes.length === 0 ? (
        <p className="text-small text-default-500">Henüz işlem notu eklenmemiş.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-medium border border-default-200 bg-content1 px-4 py-3"
            >
              <p className="text-tiny text-default-500">
                <span className="font-medium text-default-700">{note.authorLabel}</span> —{" "}
                {formatDateTime(note.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-small text-foreground">{note.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NoteForm({ documentId }: { documentId: string }) {
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
    addToast({ title: "Not eklendi.", color: "success" });
    router.refresh();
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit} noValidate>
      <Textarea
        label="Yeni işlem notu"
        labelPlacement="outside"
        placeholder="Evrakla ilgili işlem/iş birliği notu yazın…"
        value={body}
        onValueChange={setBody}
        minRows={3}
        maxLength={2000}
        description={`${body.length}/2000`}
      />
      <FormErrorSummary message={error} />
      <div>
        <SubmitButton isSubmitting={isSubmitting}>Notu ekle</SubmitButton>
      </div>
    </form>
  );
}
