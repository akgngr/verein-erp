"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Dialog, Input, Label, Spinner, TextArea, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  createProjectAction,
  updateProjectAction,
} from "../actions/project-actions";

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
        notify.error(result.error);
        return;
      }
      notify.success(t("saved"));
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {project ? t("edit") : t("new")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body className="gap-4">
              <TextField
                value={name}
                isRequired
                onChange={setName}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("name")}</Label>
                <Input maxLength={150} />
              </TextField>
              <TextField
                value={note}
                onChange={setNote}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("note")}</Label>
                <TextArea
                  maxLength={500}
                  rows={3}
                  className={["[field-sizing:content]"]
                    .filter(Boolean)
                    .join(" ")}
                />
              </TextField>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onPress={() => onOpenChange(false)}
                variant={actionVariant("default", "flat")}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={submit}
                isDisabled={name.trim().length < 2}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {project ? t("edit") : t("new")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
