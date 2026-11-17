"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormPasswordInput } from "@/shared/components/forms/form-password-input";
import { ActionButton } from "@/shared/components/ui/action-button";
import { FormModal } from "@/shared/components/ui/form-modal";
import { notify } from "@/shared/components/ui/notify";

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
    notify(t("done"), "success");
    form.reset();
    onOpenChange(false);
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t("title")}
      isSubmitting={isSubmitting}
      footer={
        <>
          <ActionButton
            color="default"
            variant="light"
            size="md"
            onPress={() => onOpenChange(false)}
            isDisabled={isSubmitting}
          >
            {tCommon("cancel")}
          </ActionButton>
          <ActionButton
            size="md"
            isDisabled={isSubmitting}
            isPending={isSubmitting}
            onPress={() => void onSubmit()}
          >
            {t("submit")}
          </ActionButton>
        </>
      }
    >
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
    </FormModal>
  );
}
