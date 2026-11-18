"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Dialog, Input, Label, Spinner, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addAgendaItemAction,
  updateAgendaItemAction,
} from "../actions/agenda-actions";

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
    notify.success(item ? t("updatedToast") : t("addedToast"));
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} key={key} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {item ? t("modalEditTitle") : t("modalAddTitle")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <TextField
                value={title}
                isRequired
                onChange={setTitle}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("itemTitle")}</Label>
                <Input minLength={2} maxLength={200} />
              </TextField>
              <TextField
                value={description}
                onChange={setDescription}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("plannedContent")}</Label>
                <TextArea
                  maxLength={2000}
                  rows={3}
                  className={["[field-sizing:content]"]
                    .filter(Boolean)
                    .join(" ")}
                />
                <Description>{t("contentHelp")}</Description>
              </TextField>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onPress={() => onOpenChange(false)}
                variant={actionVariant("default", "light")}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={submit}
                isDisabled={title.trim().length < 2}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {tCommon("save")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
