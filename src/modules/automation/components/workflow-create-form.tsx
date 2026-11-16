"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
  TextArea,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

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

  const create = () =>
    startTransition(async () => {
      const response = await createWorkflowAction({ name, description });
      if (!response.ok)
        return void toast(response.error, { variant: "danger" });
      router.push(`/automation/workflows/${response.data.id}?edit=1`);
    });

  return (
    <>
      <Button
        onPress={() => setOpen(true)}
        variant={actionVariant("primary", "solid")}
      >
        {<Plus className="h-4 w-4" />}
        {t("create")}
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {t("create")}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  value={name}
                  onChange={setName}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("name")}</Label>
                  <Input autoFocus />
                </TextField>
                <TextField
                  value={description}
                  onChange={setDescription}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("descriptionLabel")}</Label>
                  <TextArea
                    rows={2}
                    className={["[field-sizing:content]"]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => setOpen(false)}
                  variant={actionVariant("default", "light")}
                >
                  {t("cancel")}
                </Button>
                <Button
                  isDisabled={name.trim().length < 2}
                  onPress={create}
                  variant={actionVariant("primary", "solid")}
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" color="current" /> : null}
                  {t("createAndEdit")}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
