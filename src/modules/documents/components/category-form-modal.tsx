"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
  FieldError,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
} from "../actions/category-actions";
import type { CategoryListItem } from "../types";

/**
 * Kategori ekleme/düzenleme penceresi (8.5): ad 2–60 karakter; benzersizlik
 * sunucuda büyük/küçük harf duyarsız kontrol edilir.
 *
 * KARAR: Form durumu ModalContent içindedir; pencere kapandığında içerik
 * kaldırıldığı için her açılışta props'tan taze başlar (effect gerekmez).
 */
export function CategoryFormModal({
  isOpen,
  onOpenChange,
  category,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** null → yeni kategori; dolu → düzenleme. */
  category: CategoryListItem | null;
}) {
  const t = useTranslations("documents.categories");
  const router = useRouter();

  const submit = async (
    name: string,
    onClose: () => void,
  ): Promise<string | null> => {
    const result = category
      ? await updateCategoryAction({ id: category.id, name })
      : await createCategoryAction({ name });
    if (!result.ok) return result.error;
    toast(category ? t("updatedToast") : t("createdToast"), {
      variant: "success",
    });
    onClose();
    router.refresh();
    return null;
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm">
          <Modal.Dialog className={"w-full max-w-sm "}>
            {({ close: onClose }) => (
              <CategoryFormContent
                category={category}
                onClose={onClose}
                onSubmit={submit}
              />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function CategoryFormContent({
  category,
  onClose,
  onSubmit,
}: {
  category: CategoryListItem | null;
  onClose: () => void;
  onSubmit: (name: string, onClose: () => void) => Promise<string | null>;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("documents.categories");
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handle = async () => {
    setIsSubmitting(true);
    const submitError = await onSubmit(name.trim(), onClose);
    setIsSubmitting(false);
    if (submitError) setError(submitError);
  };

  return (
    <>
      <DialogDismissButton />
      <Modal.Header className="flex flex-col gap-1">
        <Modal.Heading className="flex items-center gap-2">
          {category ? t("edit") : t("new")}
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <TextField
          value={name}
          isRequired
          isInvalid={Boolean(error)}
          isDisabled={isSubmitting}
          onChange={setName}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("nameLabel")}</Label>
          <Input
            placeholder={t("namePlaceholder")}
            minLength={2}
            maxLength={60}
            autoFocus
          />
          <FieldError>{error}</FieldError>
        </TextField>
      </Modal.Body>
      <Modal.Footer>
        <Button
          onPress={onClose}
          isDisabled={isSubmitting}
          variant={actionVariant("default", "light")}
        >
          {tCommon("cancel")}
        </Button>
        <Button
          isDisabled={isSubmitting || name.trim().length < 2}
          onPress={() => void handle()}
          variant={actionVariant("primary", "solid")}
          isPending={isSubmitting}
        >
          {isSubmitting ? <Spinner size="sm" color="current" /> : null}
          {tCommon("save")}
        </Button>
      </Modal.Footer>
    </>
  );
}
