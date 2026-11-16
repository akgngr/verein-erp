"use client";

import { Button, Dropdown, Label, buttonVariants } from "@heroui-v3/react";
import { cn } from "@/shared/utils";
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
      <a
        href={buildHref("de")}
        target="_blank"
        rel="noopener"
        className={cn(
          buttonVariants({ size, variant: "outline" }),
          "rounded-r-none border-r-0",
        )}
      >
        <FileText className="h-4 w-4" aria-hidden />
        {label}
      </a>
      <Dropdown>
        <Button
          size={size}
          variant="outline"
          isIconOnly
          aria-label={aria}
          className="rounded-l-none"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>

        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu aria-label={aria}>
            <Dropdown.Item
              id="de"
              textValue={t("german")}
              href={buildHref("de")}
              target="_blank"
              rel="noopener"
            >
              <Label>{t("german")}</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id="tr"
              textValue={t("turkish")}
              href={buildHref("tr")}
              target="_blank"
              rel="noopener"
            >
              <Label>{t("turkish")}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
