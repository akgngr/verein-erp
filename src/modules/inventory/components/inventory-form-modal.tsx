"use client";

import { useDrawerPlacement } from "@/shared/hooks/use-media-query";
import { drawerDialogClass, SheetHandle } from "@/shared/components/forms/form-drawer";
import { Description, FieldError, Input, InputGroup, Label, Sheet, Spinner, Switch, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { ChevronDown } from "lucide-react";
import {
  createInventoryAction,
  updateInventoryAction,
} from "../actions/inventory-actions";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABEL_KEYS,
  INVENTORY_STATUS_LABEL_KEYS,
  INVENTORY_STATUSES,
} from "../constants";
import { toInventoryFormValues } from "../helpers/inventory-helpers";
import {
  inventoryCreateSchema,
  type InventoryFormValues,
} from "../schemas/inventory-schema";
import type { InventoryItemRow } from "../types";

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the modal edits this item, otherwise it creates a new one. */
  item?: InventoryItemRow | null;
}

const nativeSelectClassName =
  "h-10 w-full appearance-none rounded-lg bg-ink-100 px-3 pr-9 text-sm text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50";

export function InventoryFormModal({
  isOpen,
  onClose,
  item = null,
}: InventoryFormModalProps) {
  const drawerPlacement = useDrawerPlacement();
  const t = useTranslations("inventory");
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = item !== null;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryCreateSchema),
    defaultValues: toInventoryFormValues(item),
  });
  const trackAsAsset = useWatch({ control, name: "trackAsAsset" });

  useEffect(() => {
    if (isOpen) reset(toInventoryFormValues(item));
  }, [isOpen, item, reset]);

  const handleClose = () => {
    setSubmitError(null);
    onClose();
  };

  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    return message.startsWith("validation.")
      ? t(message)
      : t("validation.invalid");
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
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }} isDismissable={!isPending} placement={drawerPlacement} className={drawerDialogClass(drawerPlacement, "sm:max-w-2xl")}>
          {drawerPlacement === "bottom" ? <SheetHandle /> : null}
            <DialogDismissButton drawer />

            <form
              onSubmit={onSubmit}
              noValidate
              className="flex h-full min-h-0 flex-col"
            >
              <Sheet.Header>
                <Sheet.Heading className="flex items-center gap-2">
                  {isEdit ? t("modal.editTitle") : t("modal.createTitle")}
                </Sheet.Heading>
              </Sheet.Header>

              <Sheet.Body>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    isRequired
                    isInvalid={Boolean(errors.name)}
                    className={["sm:col-span-2"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.name")}</Label>
                    <Input
                      {...register("name")}
                      placeholder={t("placeholders.name")}
                    />
                    <FieldError>{errorText(errors.name?.message)}</FieldError>
                  </TextField>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="inventory-category"
                      className="text-sm text-foreground"
                    >
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
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="inventory-status"
                      className="text-sm text-foreground"
                    >
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
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <TextField
                    isInvalid={Boolean(errors.serialNumber)}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.serialNumber")}</Label>
                    <Input
                      {...register("serialNumber")}
                      placeholder={t("placeholders.serialNumber")}
                    />
                    <FieldError>
                      {errorText(errors.serialNumber?.message)}
                    </FieldError>
                  </TextField>

                  <TextField
                    isInvalid={Boolean(errors.location)}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.location")}</Label>
                    <Input
                      {...register("location")}
                      placeholder={t("placeholders.location")}
                    />
                    <FieldError>
                      {errorText(errors.location?.message)}
                    </FieldError>
                  </TextField>

                  <TextField
                    isRequired
                    isInvalid={Boolean(errors.quantity)}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.quantity")}</Label>
                    <Input
                      {...register("quantity", { valueAsNumber: true })}
                      type="number"
                      min={1}
                      step={1}
                    />
                    <FieldError>
                      {errorText(errors.quantity?.message)}
                    </FieldError>
                  </TextField>

                  <TextField
                    isInvalid={Boolean(errors.purchasePrice)}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.purchasePrice")}</Label>
                    <InputGroup>
                      <InputGroup.Input
                        {...register("purchasePrice", {
                          setValueAs: (value: unknown) =>
                            value === "" ||
                            value === null ||
                            value === undefined
                              ? null
                              : Number(value),
                        })}
                        type="number"
                        min={0}
                        step="0.01"
                      />
                      <InputGroup.Suffix>
                        {<span className="text-sm text-ink-400">€</span>}
                      </InputGroup.Suffix>
                    </InputGroup>
                    <FieldError>
                      {errorText(errors.purchasePrice?.message)}
                    </FieldError>
                  </TextField>

                  <TextField
                    isInvalid={Boolean(errors.purchaseDate)}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.purchaseDate")}</Label>
                    <Input
                      {...register("purchaseDate")}
                      type="date"
                      placeholder=" "
                    />
                    <FieldError>
                      {errorText(errors.purchaseDate?.message)}
                    </FieldError>
                  </TextField>

                  <TextField
                    isInvalid={Boolean(errors.assignedMemberId)}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.assignedMemberId")}</Label>
                    <Input
                      {...register("assignedMemberId")}
                      placeholder={t("placeholders.assignedMemberId")}
                    />
                    <Description>{t("hints.assignedMemberId")}</Description>
                    <FieldError>
                      {errorText(errors.assignedMemberId?.message)}
                    </FieldError>
                  </TextField>

                  <TextField
                    isInvalid={Boolean(errors.description)}
                    className={["sm:col-span-2"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("fields.description")}</Label>
                    <TextArea
                      {...register("description")}
                      placeholder={t("placeholders.description")}
                      rows={3}
                      className={["[field-sizing:content]"]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    <FieldError>
                      {errorText(errors.description?.message)}
                    </FieldError>
                  </TextField>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Switch
                      isSelected={trackAsAsset}
                      onChange={(value) =>
                        setValue("trackAsAsset", value, { shouldDirty: true })
                      }
                    >
                        <Label>{t("fields.trackAsAsset")}</Label>
                    </Switch>
                    <p className="text-xs text-ink-500">
                      {t("hints.trackAsAsset")}
                    </p>
                  </div>
                </div>

                {submitError ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger"
                  >
                    {submitError}
                  </p>
                ) : null}
              </Sheet.Body>

              <Sheet.Footer>
                <Button
                  onPress={handleClose}
                  isDisabled={isPending}
                  variant={actionVariant("default", "light")}
                >
                  {t("actions.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant={actionVariant("primary", "solid")}
                  isPending={isPending}
                >
                  {isPending ? <Spinner size="sm" tone="current" /> : null}
                  {isEdit ? t("actions.save") : t("actions.create")}
                </Button>
              </Sheet.Footer>
            </form>
    </Sheet>
  );
}
