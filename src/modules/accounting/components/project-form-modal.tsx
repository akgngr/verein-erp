"use client";

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea, addToast } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createProjectAction, updateProjectAction } from "../actions/project-actions";

type ProjectRow = {
  id: string;
  name: string;
  note: string | null;
  isActive: boolean;
};

/** Proje oluştur/düzenle modalı (§ 11.4). */
export function ProjectFormModal({
  isOpen,
  onOpenChange,
  project,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow | null;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("accounting.setup.projects");
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [note, setNote] = useState(project?.note ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = project
        ? await updateProjectAction({
            id: project.id,
            name,
            note: note || undefined,
            isActive: project.isActive,
          })
        : await createProjectAction({ name, note: note || undefined });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("saved"), color: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        <ModalHeader>{project ? t("edit") : t("new")}</ModalHeader>
        <ModalBody className="gap-4">
          <Input
            label={t("name")}
            labelPlacement="outside"
            value={name}
            onValueChange={setName}
            isRequired
            maxLength={150}
          />
          <Textarea
            label={t("note")}
            labelPlacement="outside"
            value={note}
            onValueChange={setNote}
            maxLength={500}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button color="primary" onPress={submit} isLoading={busy} isDisabled={name.trim().length < 2}>
            {project ? t("edit") : t("new")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
