"use client";
import {
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

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { CheckCircle2, XCircle } from "lucide-react";
import { sendTestMailAction } from "../actions/mail-actions";
import { removeSearchParam } from "../helpers/mail-helpers";
import {
  mailTestSchema,
  type MailTestFormValues,
} from "../schemas/mail-schema";

interface MailTestModalProps {
  isOpen: boolean;
}

type Feedback = {
  tone: "success" | "danger";
  message: string;
  detail?: string;
} | null;

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
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    return message.startsWith("validation.")
      ? t(message)
      : t("validation.invalid");
  };

  const onSubmit = handleSubmit((values) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendTestMailAction(values);
      setFeedback(
        result.ok
          ? { tone: "success", message: t("testMail.sent", { to: values.to }) }
          : {
              tone: "danger",
              message: t(`errors.${result.error}`),
              detail: result.detail,
            },
      );
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Modal.Backdrop isDismissable={!isPending}>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            <DialogDismissButton />

            <form onSubmit={onSubmit} noValidate>
              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {t("testMail.title")}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-ink-500">
                  {t("testMail.description")}
                </p>
                <TextField
                  isRequired
                  isInvalid={Boolean(errors.to)}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("fields.testRecipient")}</Label>
                  <Input
                    {...register("to")}
                    type="email"
                    placeholder={t("placeholders.testRecipient")}
                    autoFocus
                  />
                  <FieldError>{errorText(errors.to?.message)}</FieldError>
                </TextField>
                {feedback ? (
                  <div
                    role={feedback.tone === "danger" ? "alert" : "status"}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                      feedback.tone === "success"
                        ? "bg-success-50 text-success-700"
                        : "bg-danger-50 text-danger"
                    }`}
                  >
                    {feedback.tone === "success" ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span>{feedback.message}</span>
                      {feedback.detail ? (
                        <code className="break-all text-xs opacity-80">
                          {feedback.detail}
                        </code>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={handleClose}
                  isDisabled={isPending}
                  variant={actionVariant("default", "light")}
                >
                  {t("actions.close")}
                </Button>
                <Button
                  type="submit"
                  variant={actionVariant("primary", "solid")}
                  isPending={isPending}
                >
                  {isPending ? <Spinner size="sm" color="current" /> : null}
                  {t("actions.sendTest")}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
