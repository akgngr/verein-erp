"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { createInventoryAction, updateInventoryAction } from "../actions/inventory-actions";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABEL_KEYS,
  INVENTORY_STATUS_LABEL_KEYS,
  INVENTORY_STATUSES,
} from "../constants";
import { toInventoryFormValues } from "../helpers/inventory-helpers";
import { inventoryCreateSchema, type InventoryFormValues } from "../schemas/inventory-schema";
import type { InventoryItemRow } from "../types";

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the modal edits this item, otherwise it creates a new one. */
  item?: InventoryItemRow | null;
}

const nativeSelectClassName =
  "h-10 w-full appearance-none rounded-medium bg-default-100 px-3 pr-9 text-sm text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50";

export function InventoryFormModal({ isOpen, onClose, item = null }: InventoryFormModalProps) {
  const t = useTranslations("inventory");
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = item !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryCreateSchema),
    defaultValues: toInventoryFormValues(item),
  });

  useEffect(() => {
    if (isOpen) reset(toInventoryFormValues(item));
  }, [isOpen, item, reset]);

  const handleClose = () => {
    setSubmitError(null);
    onClose();
  };

  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    return message.startsWith("validation.") ? t(message) : t("validation.invalid");
  };

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = item
        ? await updateInventoryAction({ ...values, id: item.id })
        : await createInventoryAction(values);

      if (result.ok) {
        handleClose();
        return;
      }
      setSubmitError(t(`errors.${result.error}`));
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      size="2xl"
      scrollBehavior="inside"
      isDismissable={!isPending}
    >
      <ModalContent>
        <form onSubmit={onSubmit} noValidate>
          <ModalHeader>{isEdit ? t("modal.editTitle") : t("modal.createTitle")}</ModalHeader>

          <ModalBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                {...register("name")}
                label={t("fields.name")}
                placeholder={t("placeholders.name")}
                isRequired
                isInvalid={Boolean(errors.name)}
                errorMessage={errorText(errors.name?.message)}
                className="sm:col-span-2"
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inventory-category" className="text-small text-foreground">
                  {t("fields.category")}
                </label>
                <div className="relative">
                  <select
                    id="inventory-category"
                    {...register("category")}
                    className={nativeSelectClassName}
                  >
                    {INVENTORY_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {t(INVENTORY_CATEGORY_LABEL_KEYS[category])}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inventory-status" className="text-small text-foreground">
                  {t("fields.status")}
                </label>
                <div className="relative">
                  <select
                    id="inventory-status"
                    {...register("status")}
                    className={nativeSelectClassName}
                  >
                    {INVENTORY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(INVENTORY_STATUS_LABEL_KEYS[status])}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <Input
                {...register("serialNumber")}
                label={t("fields.serialNumber")}
                placeholder={t("placeholders.serialNumber")}
                isInvalid={Boolean(errors.serialNumber)}
                errorMessage={errorText(errors.serialNumber?.message)}
              />

              <Input
                {...register("location")}
                label={t("fields.location")}
                placeholder={t("placeholders.location")}
                isInvalid={Boolean(errors.location)}
                errorMessage={errorText(errors.location?.message)}
              />

              <Input
                {...register("quantity", { valueAsNumber: true })}
                type="number"
                min={1}
                step={1}
                label={t("fields.quantity")}
                isRequired
                isInvalid={Boolean(errors.quantity)}
                errorMessage={errorText(errors.quantity?.message)}
              />

              <Input
                {...register("purchasePrice", {
                  setValueAs: (value: unknown) =>
                    value === "" || value === null || value === undefined ? null : Number(value),
                })}
                type="number"
                min={0}
                step="0.01"
                label={t("fields.purchasePrice")}
                endContent={<span className="text-small text-default-400">€</span>}
                isInvalid={Boolean(errors.purchasePrice)}
                errorMessage={errorText(errors.purchasePrice?.message)}
              />

              <Input
                {...register("purchaseDate")}
                type="date"
                label={t("fields.purchaseDate")}
                placeholder=" "
                isInvalid={Boolean(errors.purchaseDate)}
                errorMessage={errorText(errors.purchaseDate?.message)}
              />

              <Input
                {...register("assignedMemberId")}
                label={t("fields.assignedMemberId")}
                placeholder={t("placeholders.assignedMemberId")}
                description={t("hints.assignedMemberId")}
                isInvalid={Boolean(errors.assignedMemberId)}
                errorMessage={errorText(errors.assignedMemberId?.message)}
              />

              <Textarea
                {...register("description")}
                label={t("fields.description")}
                placeholder={t("placeholders.description")}
                minRows={3}
                isInvalid={Boolean(errors.description)}
                errorMessage={errorText(errors.description?.message)}
                className="sm:col-span-2"
              />
            </div>

            {submitError ? (
              <p
                role="alert"
                className="rounded-medium bg-danger-50 px-3 py-2 text-small text-danger"
              >
                {submitError}
              </p>
            ) : null}
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={handleClose} isDisabled={isPending}>
              {t("actions.cancel")}
            </Button>
            <Button color="primary" type="submit" isLoading={isPending}>
              {isEdit ? t("actions.save") : t("actions.create")}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
