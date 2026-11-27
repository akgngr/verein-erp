import "server-only";

import type { Prisma } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";
import { centsToDecimalString } from "@/shared/money";

import { donationReceivedEvent } from "../automation";
import {
  allocateDonationsNumber,
  formatDonationNumber,
  formatDonorNumber,
} from "./confirmation-numbers";
import { createDonationBookings } from "./donation-bookings";

export interface ActiveDonorForBankMatch {
  id: string;
  donorNumber: number;
  donorCode: string;
  name: string;
}

function formatDonorLabel(donor: {
  type: string;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
}): string {
  if (donor.type === "ORGANIZATION") {
    return (donor.organizationName ?? "").trim();
  }
  return [donor.firstName, donor.lastName].filter(Boolean).join(" ").trim();
}

export async function listActiveDonorsForBankMatch(): Promise<
  ActiveDonorForBankMatch[]
> {
  const rows = await getDb().donor.findMany({
    where: { isActive: true, isAnonymized: false },
    select: {
      id: true,
      donorNumber: true,
      type: true,
      firstName: true,
      lastName: true,
      organizationName: true,
    },
    orderBy: { donorNumber: "asc" },
    take: 5000,
  });

  return rows.map((row) => ({
    id: row.id,
    donorNumber: row.donorNumber,
    donorCode: formatDonorNumber(row.donorNumber),
    name: formatDonorLabel(row) || formatDonorNumber(row.donorNumber),
  }));
}

function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "", lastName: parts[0] ?? "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  };
}

/**
 * One-click donation creation from an incoming bank statement row inside the
 * caller's Prisma transaction (`tx`). Uses an existing active donor or creates
 * a new donor record from the counterparty name, creates the Donation, emits
 * `donationReceivedEvent`, and creates the sourced accounting booking on `accountId`.
 */
export async function recordBankDonation(
  input: {
    donorId?: string | null;
    newDonorName?: string | null;
    newDonorType?: "PERSON" | "ORGANIZATION";
    receivedAt: Date;
    amountCents: number;
    accountId: string;
    reference: string | null;
    purposeNote: string | null;
    actor: { id: string; label: string };
  },
  tx: Prisma.TransactionClient,
): Promise<{
  donationId: string;
  donationNumber: string;
  donorId: string;
  donorCode: string;
  bookingId: string;
  bookingNumber: string;
}> {
  if (input.amountCents <= 0) {
    throw new ActionError("accounting.bank.errors.donationNeedsCredit");
  }

  let donor: { id: string; donorNumber: number };
  if (input.donorId) {
    const existing = await tx.donor.findUnique({
      where: { id: input.donorId },
      select: { id: true, donorNumber: true, isActive: true, isAnonymized: true },
    });
    if (!existing || !existing.isActive || existing.isAnonymized) {
      throw new ActionError("donations.errors.donorNotFound");
    }
    donor = { id: existing.id, donorNumber: existing.donorNumber };
  } else {
    const rawName = (input.newDonorName ?? "").trim();
    if (rawName.length < 2) {
      throw new ActionError("accounting.bank.errors.donorRequired");
    }
    const { sequence: donorNumber } = await allocateDonationsNumber(tx, "DONOR", 0);
    const type = input.newDonorType ?? "PERSON";
    const person = type === "PERSON" ? splitPersonName(rawName) : null;
    const createdDonor = await tx.donor.create({
      data: {
        donorNumber,
        type,
        firstName: person ? person.firstName.slice(0, 100) : null,
        lastName: person ? person.lastName.slice(0, 100) : null,
        organizationName: type === "ORGANIZATION" ? rawName.slice(0, 200) : null,
        createdById: input.actor.id,
        createdByLabel: input.actor.label,
      },
      select: { id: true, donorNumber: true },
    });
    donor = createdDonor;
  }

  const year = input.receivedAt.getUTCFullYear();
  const { sequence } = await allocateDonationsNumber(tx, "DONATION", year);
  const donationNumber = formatDonationNumber(year, sequence);

  const donation = await tx.donation.create({
    data: {
      donationNumber,
      year,
      sequence,
      donorId: donor.id,
      receivedAt: input.receivedAt,
      amount: centsToDecimalString(input.amountCents),
      method: "BANK_TRANSFER",
      reference: input.reference?.slice(0, 120) ?? null,
      purposeNote: input.purposeNote?.slice(0, 300) ?? null,
      waivedReimbursement: false,
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
    },
    select: { id: true, donationNumber: true },
  });

  await emitAutomationEvent(
    donationReceivedEvent,
    {
      donationId: donation.id,
      method: "BANK_TRANSFER",
      amount: input.amountCents / 100,
    },
    tx,
  );

  const booking = await createDonationBookings(tx, {
    actor: input.actor,
    donationId: donation.id,
    donationNumber: donation.donationNumber,
    donorNumber: donor.donorNumber,
    receivedAt: input.receivedAt,
    amountCents: input.amountCents,
    method: "BANK_TRANSFER",
    waivedReimbursement: false,
    expenseCategoryId: null,
    accountId: input.accountId,
  });

  await tx.donation.update({
    where: { id: donation.id },
    data: { bookingNumber: booking.bookingNumber },
  });

  return {
    donationId: donation.id,
    donationNumber: donation.donationNumber,
    donorId: donor.id,
    donorCode: formatDonorNumber(donor.donorNumber),
    bookingId: booking.bookingId,
    bookingNumber: booking.bookingNumber,
  };
}
