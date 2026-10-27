"use client";

import { Button } from "@heroui/react";
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
  const [reverseOpen, setReverseOpen] = useState(false);

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canUpdate ? (
          <Button
            as="a"
            href={`/muhasebe/${bookingId}/duzenle`}
            size="sm"
            color="primary"
            variant="solid"
            startContent={<Pencil className="h-4 w-4" aria-hidden />}
          >
            Düzenle
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<Ban className="h-4 w-4" aria-hidden />}
            onPress={() => setReverseOpen(true)}
          >
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
