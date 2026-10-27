import "server-only";

import type { LetterheadProfile } from "@/shared/pdf/letterhead";

import type { ConfirmationPdfData } from "../pdf/confirmation-document";
import type { RecipientSnapshot } from "./confirmation-builder";
import type { AnlageItemRow } from "../pdf/confirmation-document";

/**
 * Anlık görüntü → PDF verisi köprüsü (§ 11 md. 9): depolanmış PDF'in üretimi
 * yalnızca SNAPSHOT'tan yapılır (dış bağımlılık yok — deterministik, § 13
 * batch md. 3: "renders one multi-page PDF from the stored snapshots").
 */
export async function confirmationIssuerSnapshotToPdf(args: {
  recipient: RecipientSnapshot;
  issuer: Record<string, unknown>;
  lang: "de";
  kind: "SINGLE" | "COLLECTIVE";
  content: "DONATION" | "MEMBERSHIP_FEE";
  totalCents: number;
  amountInWords: string;
  periodFrom: Date;
  periodTo: Date;
  waived: boolean;
  items: AnlageItemRow[];
}): Promise<ConfirmationPdfData> {
  const issuer = args.issuer;
  const organization: LetterheadProfile = {
    name: String(issuer.name ?? ""),
    street: (issuer.street as string | null) ?? null,
    postalCode: (issuer.postalCode as string | null) ?? null,
    city: (issuer.city as string | null) ?? null,
    // Antette ayrıca Gemeinnützigkeit satırı İSTEĞE BAĞLIdır; bildirim gövdesinde
    // muafiyet paragrafı zaten tam metin olarak basılır (§ 13 md. 6) — antet
    // satırını yalnız tür+Finanzamt doluysa göster.
    taxNumber: (issuer.taxNumber as string | null) ?? null,
    taxOffice: (issuer.taxOffice as string | null) ?? null,
  };

  return {
    organization,
    confirmationNumber: null, // satır oluştuktan sonra handler numarayı ekler
    isPreview: false,
    kind: args.kind,
    content: args.content,
    recipient: args.recipient,
    totalCents: args.totalCents,
    amountInWords: args.amountInWords,
    periodFrom: args.periodFrom,
    periodTo: args.periodTo,
    waived: args.waived,
    membershipFeesDeductible: Boolean(issuer.membershipFeesDeductible),
    items: args.items,
    issuedPlace: String(issuer.city ?? ""),
    issueDate: new Date(),
    attachment: args.kind === "COLLECTIVE",
    // PDF gövdesi snapshot alanlarını doğrudan okur (§ 13 md. 6/7).
    issuerSnapshotData: issuer,
  };
}
