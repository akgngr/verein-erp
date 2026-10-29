"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
} from "@heroui/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { sendTestMailAction } from "../actions/mail-actions";
import { removeSearchParam } from "../helpers/mail-helpers";
import { mailTestSchema, type MailTestFormValues } from "../schemas/mail-schema";

interface MailTestModalProps {
  isOpen: boolean;
}

type Feedback = { tone: "success" | "danger"; message: string; detail?: string } | null;

/** Test e-mail dialog driven by `?action=test`; removes the param on close. */
export function MailTestModal({ isOpen }: MailTestModalProps) {
  const t = useTranslations("mail");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MailTestFormValues>({
    resolver: zodResolver(mailTestSchema),
    defaultValues: { to: "" },
  });

  useEffect(() => {
    if (isOpen) reset({ to: "" });
  }, [isOpen, reset]);

  const handleClose = () => {
    setFeedback(null);
    const query = removeSearchParam(searchParams.toString(), "action");
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    return message.startsWith("validation.") ? t(message) : t("validation.invalid");
  };

  const onSubmit = handleSubmit((values) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendTestMailAction(values);
      setFeedback(
        result.ok
          ? { tone: "success", message: t("testMail.sent", { to: values.to }) }
          : { tone: "danger", message: t(`errors.${result.error}`), detail: result.detail },
      );
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      size="md"
      isDismissable={!isPending}
    >
      <ModalContent>
        <form onSubmit={onSubmit} noValidate>
          <ModalHeader>{t("testMail.title")}</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500">{t("testMail.description")}</p>
            <Input
              {...register("to")}
              type="email"
              label={t("fields.testRecipient")}
              placeholder={t("placeholders.testRecipient")}
              isRequired
              autoFocus
              isInvalid={Boolean(errors.to)}
              errorMessage={errorText(errors.to?.message)}
            />
            {feedback ? (
              <div
                role={feedback.tone === "danger" ? "alert" : "status"}
                className={`flex items-start gap-2 rounded-medium px-3 py-2 text-small ${
                  feedback.tone === "success"
                    ? "bg-success-50 text-success-700"
                    : "bg-danger-50 text-danger"
                }`}
              >
                {feedback.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span>{feedback.message}</span>
                  {feedback.detail ? (
                    <code className="break-all text-tiny opacity-80">{feedback.detail}</code>
                  ) : null}
                </div>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={handleClose} isDisabled={isPending}>
              {t("actions.close")}
            </Button>
            <Button color="primary" type="submit" isLoading={isPending}>
              {t("actions.sendTest")}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
