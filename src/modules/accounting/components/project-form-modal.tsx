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
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("saved"), { variant: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                {project ? t("edit") : t("new")}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
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
            </Modal.Body>
            <Modal.Footer>
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
                {busy ? <Spinner size="sm" color="current" /> : null}
                {project ? t("edit") : t("new")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
