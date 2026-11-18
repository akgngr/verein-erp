"use client";

import { notify } from "@/shared/components/ui/notify";
import { Dialog, FieldError, Input, Label, Spinner, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveMandateAction } from "../actions/mandate-actions";

type Mandate = {
  ibanMasked: string | null;
  bic: string | null;
  accountHolder: string | null;
  reference: string | null;
  date: string | null;
  defaultReference: string;
  defaultHolder: string;
};

/** SEPA-Lastschriftmandat kartı (aidat yetkisi olanlara). IBAN maskeli gösterilir. */
export function MandateCard({
  memberId,
  mandate,
  canEdit,
}: {
  memberId: string;
  mandate: Mandate;
  canEdit: boolean;
}) {
  const t = useTranslations("members.mandate");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    iban: "",
    bic: mandate.bic ?? "",
    accountHolder: mandate.accountHolder ?? mandate.defaultHolder,
    reference: mandate.reference ?? mandate.defaultReference,
    date: mandate.date ?? "",
  });
  const save = (remove: boolean) =>
    start(async () => {
      const response = await saveMandateAction({
        memberId,
        remove,
        ...form,
        iban: remove ? "" : form.iban,
      });
      if (!response.ok) {
        setErrors(
          Object.fromEntries(
            Object.entries(response.fieldErrors ?? {}).map(([key, value]) => [
              key,
              translate(value?.[0]) ?? "",
            ]),
          ),
        );
        return void notify.error(translate(response.error));
      }
      notify.success(t("saved"));
      setOpen(false);
      router.refresh();
    });
  const field = (key: keyof typeof form, type = "text") => (
    <TextField
      value={form[key]}
      isInvalid={Boolean(errors[key])}
      onChange={(value) => setForm({ ...form, [key]: value })}
      className={["w-full"].filter(Boolean).join(" ")}
    >
      <Label>{t(`fields.${key}`)}</Label>
      <Input
        placeholder={
          key === "iban" && mandate.ibanMasked ? mandate.ibanMasked : " "
        }
        type={type}
      />
      <FieldError>{errors[key]}</FieldError>
    </TextField>
  );

  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Landmark className="size-4 text-ink-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          {t("title")}
        </h2>
        {canEdit ? (
          <Button
            size="sm"
            className="ms-auto"
            onPress={() => setOpen(true)}
            variant={actionVariant("default", "flat")}
          >
            {mandate.ibanMasked ? t("edit") : t("add")}
          </Button>
        ) : null}
      </div>
      {mandate.ibanMasked ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-500">{t("fields.iban")}</dt>
            <dd className="font-mono">{mandate.ibanMasked}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">
              {t("fields.accountHolder")}
            </dt>
            <dd>{mandate.accountHolder}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">{t("fields.reference")}</dt>
            <dd className="font-mono">{mandate.reference}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">{t("fields.date")}</dt>
            <dd>{mandate.date}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-ink-500">{t("none")}</p>
      )}
      <Dialog isOpen={open} onOpenChange={setOpen} size="lg" className={"w-full max-w-lg "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("title")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <p className="text-xs text-ink-500">{t("help")}</p>
                {field("iban")}
                {mandate.ibanMasked ? (
                  <p className="-mt-2 text-xs text-ink-500">{t("ibanKeep")}</p>
                ) : null}
                {field("bic")}
                {field("accountHolder")}
                {field("reference")}
                {field("date", "date")}
              </Dialog.Body>
              <Dialog.Footer>
                {mandate.ibanMasked ? (
                  <Button
                    className="me-auto"
                    isDisabled={pending}
                    onPress={() => save(true)}
                    variant={actionVariant("danger", "light")}
                  >
                    {t("remove")}
                  </Button>
                ) : null}
                <Button
                  onPress={() => setOpen(false)}
                  variant={actionVariant("default", "light")}
                >
                  {t("cancel")}
                </Button>
                <Button
                  onPress={() => save(false)}
                  variant={actionVariant("primary", "solid")}
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" tone="current" /> : null}
                  {t("save")}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </div>
  );
}
