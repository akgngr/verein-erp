"use client";
import { toast, Button, Spinner, Modal } from "@heroui/react";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { zodResolver } from "@hookform/resolvers/zod";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormPasswordInput } from "@/shared/components/forms/form-password-input";

import { resetUserPasswordAction } from "../actions/reset-password";
import { userResetPasswordSchema } from "../schemas/user";

/**
 * Parola sıfırlama: yönetici yeni geçici parolayı belirler;
 * kullanıcı sonraki girişte parolasını değiştirmeye zorlanır (11.1).
 */
export function ResetPasswordDialog({
  userId,
  isOpen,
  onOpenChange,
}: {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("users.resetPassword");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<{ password: string }>({
    resolver: zodResolver(userResetPasswordSchema.pick({ password: true })),
    defaultValues: { password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await resetUserPasswordAction({
      id: userId,
      password: values.password,
    });
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    toast(t("done"), { variant: "success" });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!form.formState.isSubmitting}>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            {() => (
              <>
                <DialogDismissButton />
                <Modal.Header className="flex flex-col gap-1">
                  <Modal.Heading className="flex items-center gap-2">
                    {t("title")}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={onSubmit}
                    noValidate
                  >
                    <FormPasswordInput
                      name="password"
                      label={t("newPassword")}
                      control={form.control}
                      allowGenerate
                      isRequired
                      description={tValidation("passwordHint")}
                    />
                    <FormErrorSummary message={formError} />
                  </form>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    onPress={() => onOpenChange(false)}
                    isDisabled={form.formState.isSubmitting}
                    variant={actionVariant("default", "light")}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    isDisabled={form.formState.isSubmitting}
                    onPress={() => void onSubmit()}
                    variant={actionVariant("primary", "solid")}
                    isPending={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <Spinner size="sm" color="current" />
                    ) : null}
                    {t("submit")}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
