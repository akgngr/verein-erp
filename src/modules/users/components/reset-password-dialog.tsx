"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
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
    const result = await resetUserPasswordAction({ id: userId, password: values.password });
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({
      title: t("done"),
      color: "success",
    });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      isDismissable={!form.formState.isSubmitting}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">{t("title")}</ModalHeader>
            <ModalBody>
              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
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
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => onOpenChange(false)}
                isDisabled={form.formState.isSubmitting}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                color="primary"
                isLoading={form.formState.isSubmitting}
                isDisabled={form.formState.isSubmitting}
                onPress={() => void onSubmit()}
              >
                {t("submit")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
