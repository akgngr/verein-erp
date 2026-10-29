"use client";

import { useTranslations } from "next-intl";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  addToast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addAgendaItemAction, updateAgendaItemAction } from "../actions/agenda-actions";

/**
 * Gündem maddesi ekleme/düzenleme penceresi (7.3): başlık + planlanan içerik.
 * Görüşme metni bu pencereye girilmez (kendi editörü vardır — 5. bölüm md. 7).
 */
export function AgendaItemModal({
  meetingId,
  item,
  isOpen,
  onOpenChange,
}: {
  meetingId: string;
  item: { id: string; title: string; description: string | null } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.agenda");
  const router = useRouter();
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // KARAR: modal açılış verisi prop'tan türetilir; item değişince form tazelenir.
  const key = item?.id ?? "new";

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = item
      ? await updateAgendaItemAction({ id: item.id, title, description })
      : await addAgendaItemAction({ meetingId, title, description });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({ title: item ? t("updatedToast") : t("addedToast"), color: "success" });
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} key={key}>
      <ModalContent>
        <ModalHeader>{item ? t("modalEditTitle") : t("modalAddTitle")}</ModalHeader>
        <ModalBody>
          <Input
            label={t("itemTitle")}
            labelPlacement="outside"
            value={title}
            onValueChange={setTitle}
            isRequired
            minLength={2}
            maxLength={200}
          />
          <Textarea
            label={t("plannedContent")}
            labelPlacement="outside"
            value={description}
            onValueChange={setDescription}
            minRows={3}
            maxLength={2000}
            description={t("contentHelp")}
          />
          {error ? <p className="text-small text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button color="primary" isLoading={busy} onPress={submit} isDisabled={title.trim().length < 2}>
            {tCommon("save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
