"use client";
import { Button, toast } from "@heroui/react";
import { Dialog, Input, Label, Spinner, TextArea, TextField } from "@/shared/components/kit";

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
      <Dialog isOpen={open} onOpenChange={setOpen} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("create")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
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
              </Dialog.Body>
              <Dialog.Footer>
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
                  {pending ? <Spinner size="sm" tone="current" /> : null}
                  {t("createAndEdit")}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </>
  );
}
