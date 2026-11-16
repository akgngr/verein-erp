"use client";
import { Drawer, Modal } from "@heroui/react";
import { useTranslations } from "next-intl";

/** Localized close controls shared by application dialogs. */
export function DialogDismissButton({ drawer = false }: { drawer?: boolean }) {
  const t = useTranslations("common");
  return drawer ? (
    <Drawer.CloseTrigger aria-label={t("cancel")} />
  ) : (
    <Modal.CloseTrigger aria-label={t("cancel")} />
  );
}
