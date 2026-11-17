"use client";

import { Ban, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ActionButton } from "@/shared/components/ui/action-button";
import { LinkButton } from "@/shared/components/ui/link-button";

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
          <LinkButton
            href={`/muhasebe/${bookingId}?duzenle`}
            startIcon={<Pencil className="h-4 w-4" aria-hidden />}
          >
            {tCommon("edit")}
          </LinkButton>
        ) : null}
        {canDelete ? (
          <ActionButton
            color="danger"
            variant="flat"
            startIcon={<Ban className="h-4 w-4" aria-hidden />}
            onPress={() => setReverseOpen(true)}
          >
            İptal et (Storno)
          </ActionButton>
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
