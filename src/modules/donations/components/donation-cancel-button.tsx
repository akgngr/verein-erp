"use client";
import { ActionButton } from "@/shared/components/ui/action-button";

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
      <ActionButton
        color="danger"
        variant="flat"
        startIcon={props.icon}
        onPress={() => setOpen(true)}
      >
        {props.label}
      </ActionButton>
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
