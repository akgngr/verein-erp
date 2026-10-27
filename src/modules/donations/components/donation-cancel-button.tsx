"use client";

import { Button } from "@heroui/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { CancelDonationModal } from "./cancel-donation-modal";

/** Detay sayfası iptal butonu (aynı diyaloğu açar). */
export function DonationCancelButton(props: {
  donationId: string;
  donationNumber: string;
  label: string;
  reasonLabel: string;
  hint: string;
  toastTitle: string;
  icon: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="flat" color="danger" startContent={props.icon} onPress={() => setOpen(true)}>
        {props.label}
      </Button>
      <CancelDonationModal
        isOpen={open}
        onOpenChange={setOpen}
        donationId={props.donationId}
        donationNumber={props.donationNumber}
        title={props.label}
        reasonLabel={props.reasonLabel}
        hint={props.hint}
        confirmLabel={props.label}
        toastTitle={props.toastTitle}
      />
    </>
  );
}
