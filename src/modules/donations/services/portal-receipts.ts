import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { getDb } from "@/shared/db";
import { resolveSafePath } from "@/shared/files";

export type PortalDonationConfirmationRow = {
  id: string;
  confirmationNumber: string;
  year: number;
  amountCents: number;
  periodFrom: Date;
  periodTo: Date;
  issuedAt: Date;
};

export async function listDonationConfirmationsForPortal(
  memberId: string,
): Promise<PortalDonationConfirmationRow[]> {
  const db = getDb();
  const rows = await db.zuwendungConfirmation.findMany({
    where: {
      status: "ISSUED",
      pdfStoragePath: { not: null },
      OR: [{ memberId }, { donor: { memberId } }],
    },
    orderBy: [{ issuedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      confirmationNumber: true,
      year: true,
      totalAmount: true,
      periodFrom: true,
      periodTo: true,
      issuedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    confirmationNumber: row.confirmationNumber,
    year: row.year,
    amountCents: Number(row.totalAmount.mul(100).toFixed(0)),
    periodFrom: row.periodFrom,
    periodTo: row.periodTo,
    issuedAt: row.issuedAt,
  }));
}

export async function getDonationConfirmationPdfForPortal(input: {
  memberId: string;
  confirmationId: string;
}): Promise<{ bytes: Buffer; confirmationNumber: string } | null> {
  const db = getDb();
  const confirmation = await db.zuwendungConfirmation.findFirst({
    where: {
      id: input.confirmationId,
      status: "ISSUED",
      OR: [{ memberId: input.memberId }, { donor: { memberId: input.memberId } }],
    },
    select: {
      id: true,
      confirmationNumber: true,
      pdfStoragePath: true,
      pdfSha256: true,
    },
  });

  if (!confirmation?.pdfStoragePath || !confirmation.pdfSha256) {
    return null;
  }

  const absolutePath = resolveSafePath(confirmation.pdfStoragePath);
  const fileBuffer = await readFile(absolutePath);
  const actualHash = createHash("sha256").update(fileBuffer).digest("hex");
  if (actualHash !== confirmation.pdfSha256) {
    return null;
  }

  return {
    bytes: fileBuffer,
    confirmationNumber: confirmation.confirmationNumber,
  };
}
