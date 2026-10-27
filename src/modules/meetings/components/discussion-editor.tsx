"use client";

import { Button, Textarea, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateAgendaDiscussionAction } from "../actions/agenda-actions";

/**
 * Görüşme editörü (7.3 Gündem): textarea + açık Kaydet düğmesi; kilitliyken
 * kayıtlı metin salt okunur gösterilir. Metin whitespace-pre-wrap ile
 * oluğuz yazılır, HTML olarak ASLA (5. bölüm md. 12).
 */
export function DiscussionEditor({
  itemId,
  initialDiscussion,
  editable,
}: {
  itemId: string;
  initialDiscussion: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialDiscussion ?? "");
  const [busy, setBusy] = useState(false);

  if (!editable) {
    if (!initialDiscussion) return null;
    return (
      <div className="mt-2">
        <p className="text-tiny font-medium text-default-500">Görüşmeler:</p>
        <p className="whitespace-pre-wrap text-small">{initialDiscussion}</p>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <p className="text-tiny font-medium text-default-500">Görüşmeler:</p>
        {initialDiscussion ? (
          <p className="whitespace-pre-wrap text-small">{initialDiscussion}</p>
        ) : (
          <p className="text-small text-default-400">Henüz görüşme notu girilmemiş.</p>
        )}
        <Button
          size="sm"
          variant="light"
          className="mt-1"
          onPress={() => {
            setValue(initialDiscussion ?? "");
            setEditing(true);
          }}
        >
          {initialDiscussion ? "Düzenle" : "Görüşme ekle"}
        </Button>
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    const result = await updateAgendaDiscussionAction({
      id: itemId,
      discussion: value,
    });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: "Görüşme metni kaydedildi", color: "success" });
    setEditing(false);
    router.refresh();
  };

  return (
    <div className="mt-2">
      <Textarea
        label="Görüşmeler (tutanak metni)"
        labelPlacement="outside"
        value={value}
        onValueChange={setValue}
        minRows={4}
        maxLength={10000}
        description="En fazla 10000 karakter; satır sonları korunur."
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" color="primary" isLoading={busy} onPress={save}>
          Kaydet
        </Button>
        <Button size="sm" variant="light" onPress={() => setEditing(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
