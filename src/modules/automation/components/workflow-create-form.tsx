"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from "@heroui/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createWorkflowAction } from "../actions/workflow-actions";

export function WorkflowCreateForm() {
  const t = useTranslations("automation.workflows");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const create = () => startTransition(async () => {
    const response = await createWorkflowAction({ name, description });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    router.push(`/automation/workflows/${response.data.id}?edit=1`);
  });

  return (
    <>
      <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={() => setOpen(true)}>{t("create")}</Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>{t("create")}</ModalHeader>
          <ModalBody>
            <Input autoFocus label={t("name")} value={name} onValueChange={setName} />
            <Textarea label={t("descriptionLabel")} minRows={2} value={description} onValueChange={setDescription} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>{t("cancel")}</Button>
            <Button color="primary" isLoading={pending} isDisabled={name.trim().length < 2} onPress={create}>{t("createAndEdit")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
