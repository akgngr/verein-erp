"use client";

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { ChevronDown, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * PDF split button (Faz 4, 4.3): ana tıklama = varsayılan dil ( DOCUMENT_LANGUAGE,
 * Almanca); açılır menüden "Almanca (Deutsch)" / "Türkçe" seçimi ile URL'e
 * ?lang= eklenerek yeni sekmede açılır. Tüm PDF butonları (tutanak, makbuz,
 * kasa defteri, kassenbericht) bu bileşeni kullanır.
 */
export function PdfSplitButton({
  buildHref,
  label,
  aria,
  size = "sm",
}: {
  /** Dil → PDF URL'i (target=_blank ile açılır). */
  buildHref: (lang: "de" | "tr") => string;
  /** Ana buton metni (modül namespace'inden gelir). */
  label: string;
  /** Erişilebilir ad (menü). */
  aria: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("pdfLanguage");
  return (
    <div className="flex items-stretch gap-0">
      <Button
        as="a"
        size={size}
        variant="bordered"
        color="primary"
        startContent={<FileText className="h-4 w-4" aria-hidden />}
        href={buildHref("de")}
        target="_blank"
        rel="noopener"
        className="rounded-r-none border-r-0"
      >
        {label}
      </Button>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button
            size={size}
            variant="bordered"
            color="primary"
            isIconOnly
            aria-label={aria}
            className="rounded-l-none"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label={aria}>
          <DropdownItem key="de" textValue={t("german")}>
            {t("german")}
          </DropdownItem>
          <DropdownItem key="tr" textValue={t("turkish")}>
            {t("turkish")}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
