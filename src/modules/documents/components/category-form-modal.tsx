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
  addToast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createCategoryAction, updateCategoryAction } from "../actions/category-actions";
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

  const submit = async (name: string, onClose: () => void): Promise<string | null> => {
    const result = category
      ? await updateCategoryAction({ id: category.id, name })
      : await createCategoryAction({ name });
    if (!result.ok) return result.error;
    addToast({ title: category ? t("updatedToast") : t("createdToast"), color: "success" });
    onClose();
    router.refresh();
    return null;
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm" isDismissable>
      <ModalContent>
        {(onClose) => (
          <CategoryFormContent category={category} onClose={onClose} onSubmit={submit} />
        )}
      </ModalContent>
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
      <ModalHeader className="flex flex-col gap-1">
        {category ? t("edit") : t("new")}
      </ModalHeader>
      <ModalBody>
        <Input
          label={t("nameLabel")}
          labelPlacement="outside"
          placeholder={t("namePlaceholder")}
          value={name}
          onValueChange={setName}
          isRequired
          minLength={2}
          maxLength={60}
          isInvalid={Boolean(error)}
          errorMessage={error}
          isDisabled={isSubmitting}
          autoFocus
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
          {tCommon("cancel")}
        </Button>
        <Button
          color="primary"
          isLoading={isSubmitting}
          isDisabled={isSubmitting || name.trim().length < 2}
          onPress={() => void handle()}
        >
          {tCommon("save")}
        </Button>
      </ModalFooter>
    </>
  );
}
