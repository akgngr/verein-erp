"use client";

import { Check, Copy, FileText, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button, Dialog, Input, Label, TextArea, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";

import { buildFeeExemptionLetterText, escapeLetterHtml, type FeeExemptionLetterOrganization } from "../services/fee-exemption-letter";

export function FeeExemptionLetterModal({
  isOpen,
  onOpenChange,
  initialPersonName,
  organization,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialPersonName?: string;
  organization?: FeeExemptionLetterOrganization;
}) {
  const t = useTranslations("youth-protection.letter");
  const [personName, setPersonName] = useState(initialPersonName ?? "");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [copied, setCopied] = useState(false);

  const letterText = useMemo(() => {
    return buildFeeExemptionLetterText({
      personName: personName || t("namePlaceholder"),
      birthDate: birthDate || undefined,
      address: address || undefined,
      role: role || undefined,
      // #585: Kurum adı ve şehri kurum profilinden (önceden sabit "Unser Verein e.V." / "Berlin").
      organizationName: organization?.name ?? undefined,
      organizationCity: organization?.city ?? undefined,
    });
  }, [personName, birthDate, address, role, t, organization]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      notify.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error(t("copyFailed"));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify.error(t("printPopupBlocked"));
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeLetterHtml(t("title"))}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              margin: 40mm 25mm 25mm 25mm;
              color: #000;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>${escapeLetterHtml(letterText)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} size="lg" aria-label={t("title")}>
      <Dialog.Header className="flex items-center gap-2 border-b border-divider pb-3">
        <FileText className="h-5 w-5 text-primary" />
        <Dialog.Heading className="text-lg font-semibold">{t("title")}</Dialog.Heading>
      </Dialog.Header>

      <Dialog.Body className="flex flex-col gap-4 py-4">
        <p className="text-sm text-foreground-500">{t("description")}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField value={personName} onChange={setPersonName}>
            <Label>{t("personName")}</Label>
            <Input placeholder={t("namePlaceholder")} />
          </TextField>
          <TextField value={role} onChange={setRole}>
            <Label>{t("role")}</Label>
            <Input placeholder={t("rolePlaceholder")} />
          </TextField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField value={birthDate} onChange={setBirthDate}>
            <Label>{t("birthDate")}</Label>
            <Input placeholder="DD.MM.YYYY" />
          </TextField>
          <TextField value={address} onChange={setAddress}>
            <Label>{t("address")}</Label>
            <Input placeholder={t("addressPlaceholder")} />
          </TextField>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-foreground-500">
            {t("previewTitle")}
          </span>
          <TextField value={letterText}>
            <Label>{t("previewLabel")}</Label>
            <TextArea rows={12} readOnly className="font-mono text-xs" />
          </TextField>
        </div>
      </Dialog.Body>

      <Dialog.Footer className="flex items-center justify-between border-t border-divider pt-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onPress={handleCopy}
            className="flex items-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("copiedButton") : t("copyButton")}
          </Button>
          <Button
            variant="secondary"
            onPress={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            {t("printButton")}
          </Button>
        </div>
        <Button variant="tertiary" onPress={() => onOpenChange(false)}>
          {t("close")}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
