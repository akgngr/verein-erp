"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";

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
      title: "Parola sıfırlandı. Kullanıcı sonraki girişte yeni parola belirleyecek.",
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
            <ModalHeader className="flex flex-col gap-1">Parolayı Sıfırla</ModalHeader>
            <ModalBody>
              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                <FormInput
                  name="password"
                  label="Yeni geçici parola"
                  control={form.control}
                  type="password"
                  autoComplete="new-password"
                  isRequired
                  description="En az 10 karakter; 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir."
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
                Vazgeç
              </Button>
              <Button
                color="primary"
                isLoading={form.formState.isSubmitting}
                isDisabled={form.formState.isSubmitting}
                onPress={() => void onSubmit()}
              >
                Sıfırla
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
