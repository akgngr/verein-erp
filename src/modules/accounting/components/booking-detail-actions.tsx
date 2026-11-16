"use client";
import { Link as ActionLink, buttonVariants, Button } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { Ban, Pencil } from "lucide-react";
import { useState } from "react";

import { ReverseModal } from "./reverse-modal";

/** Fiş detay aksiyonları (§ 11.3): Düzenle + İptal (Storno). */
export function BookingDetailActions({
  bookingId,
  bookingNumber,
  canUpdate,
  canDelete,
}: {
  bookingId: string;
  bookingNumber: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const tCommon = useTranslations("common");
  const [reverseOpen, setReverseOpen] = useState(false);

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canUpdate ? (
          <ActionLink
            href={`/muhasebe/${bookingId}?duzenle`}
            className={buttonVariants({
              variant: actionVariant("primary", "solid"),
              size: "sm",
            })}
          >
            {<Pencil className="h-4 w-4" aria-hidden />}
            {tCommon("edit")}
          </ActionLink>
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            onPress={() => setReverseOpen(true)}
            variant={actionVariant("danger", "flat")}
          >
            {<Ban className="h-4 w-4" aria-hidden />}
            İptal et (Storno)
          </Button>
        ) : null}
      </div>

      <ReverseModal
        isOpen={reverseOpen}
        onOpenChange={setReverseOpen}
        bookingId={bookingId}
        bookingNumber={bookingNumber}
      />
    </>
  );
}
