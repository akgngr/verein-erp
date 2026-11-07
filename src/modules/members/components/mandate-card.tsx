"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveMandateAction } from "../actions/mandate-actions";

type Mandate = { ibanMasked: string | null; bic: string | null; accountHolder: string | null; reference: string | null; date: string | null; defaultReference: string; defaultHolder: string };


/** SEPA-Lastschriftmandat kartı (aidat yetkisi olanlara). IBAN maskeli gösterilir. */
export function MandateCard({ memberId, mandate, canEdit }: { memberId: string; mandate: Mandate; canEdit: boolean }) {
  const t = useTranslations("members.mandate");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ iban: "", bic: mandate.bic ?? "", accountHolder: mandate.accountHolder ?? mandate.defaultHolder, reference: mandate.reference ?? mandate.defaultReference, date: mandate.date ?? "" });
  const save = (remove: boolean) => start(async () => {
    const response = await saveMandateAction({ memberId, remove, ...form, iban: remove ? "" : form.iban });
    if (!response.ok) {
      setErrors(Object.fromEntries(Object.entries(response.fieldErrors ?? {}).map(([key, value]) => [key, translate(value?.[0]) ?? ""])));
      return void addToast({ title: translate(response.error), color: "danger" });
    }
    addToast({ title: t("saved"), color: "success" });
    setOpen(false);
    router.refresh();
  });
  const field = (key: keyof typeof form, type = "text") => (
    <Input label={t(`fields.${key}`)} labelPlacement="outside" placeholder={key === "iban" && mandate.ibanMasked ? mandate.ibanMasked : " "} type={type} value={form[key]} onValueChange={(value) => setForm({ ...form, [key]: value })} isInvalid={Boolean(errors[key])} errorMessage={errors[key]} />
  );

  return (
    <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Landmark className="size-4 text-default-500" />
        <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{t("title")}</h2>
        {canEdit ? <Button size="sm" variant="flat" className="ms-auto" onPress={() => setOpen(true)}>{mandate.ibanMasked ? t("edit") : t("add")}</Button> : null}
      </div>
      {mandate.ibanMasked ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-small sm:grid-cols-2">
          <div><dt className="text-tiny text-default-500">{t("fields.iban")}</dt><dd className="font-mono">{mandate.ibanMasked}</dd></div>
          <div><dt className="text-tiny text-default-500">{t("fields.accountHolder")}</dt><dd>{mandate.accountHolder}</dd></div>
          <div><dt className="text-tiny text-default-500">{t("fields.reference")}</dt><dd className="font-mono">{mandate.reference}</dd></div>
          <div><dt className="text-tiny text-default-500">{t("fields.date")}</dt><dd>{mandate.date}</dd></div>
        </dl>
      ) : <p className="text-small text-default-500">{t("none")}</p>}
      <Modal isOpen={open} onOpenChange={setOpen} size="lg">
        <ModalContent>
          <ModalHeader>{t("title")}</ModalHeader>
          <ModalBody>
            <p className="text-tiny text-default-500">{t("help")}</p>
            {field("iban")}
            {mandate.ibanMasked ? <p className="-mt-2 text-tiny text-default-500">{t("ibanKeep")}</p> : null}
            {field("bic")}
            {field("accountHolder")}
            {field("reference")}
            {field("date", "date")}
          </ModalBody>
          <ModalFooter>
            {mandate.ibanMasked ? <Button color="danger" variant="light" className="me-auto" isDisabled={pending} onPress={() => save(true)}>{t("remove")}</Button> : null}
            <Button variant="light" onPress={() => setOpen(false)}>{t("cancel")}</Button>
            <Button color="primary" isLoading={pending} onPress={() => save(false)}>{t("save")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
