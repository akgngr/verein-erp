import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";
import { EpcQrBlock } from "@/shared/pdf/qr-code";

import {
  exemptionParagraph,
  NON_DEDUCTIBLE_TEXT,
  SIMPLIFIED_PROOF_DISCLAIMER,
  SIMPLIFIED_PROOF_DONATION_HEADING,
  SIMPLIFIED_PROOF_PURPOSE_HEADING,
  SIMPLIFIED_PROOF_QR_CAPTION,
  SIMPLIFIED_PROOF_QR_TITLE,
  SIMPLIFIED_PROOF_SUBTITLE,
  SIMPLIFIED_PROOF_TITLE,
  SIMPLIFIED_PROOF_USAGE,
  USAGE_SINGLE,
  type ExemptionDocumentTypeKey,
} from "./template-de";

/**
 * Vereinfachter Spendennachweis (§ 50 Abs. 4 Satz 1 Nr. 2 EStDV, <= 300 EUR).
 * Immer Deutsch (amtlicher steuerlicher Beleg). Optional mit konkreter Spende
 * und lokal erzeugtem EPC-QR (GiroCode) für das Spendenkonto.
 */
export type SimplifiedProofPdfData = {
  organization: LetterheadProfile;
  exemptionDocumentType: ExemptionDocumentTypeKey | null;
  exemptionNoticeDate: Date | null;
  exemptionNoticePeriod: string | null;
  charitablePurposes: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  membershipFeesDeductible: boolean;
  /** Optional specific monetary donation (<= 300 EUR). */
  donation?: {
    donationNumber: string;
    receivedAt: Date;
    amountCents: number;
    purposeNote: string | null;
  } | null;
  /** Optional creditor bank details for local GiroCode (EPC-QR). */
  creditor?: {
    iban: string;
    bic: string | null;
  } | null;
  issuedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 48,
    fontFamily: "NotoSans",
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#111111",
  },
  title: { fontSize: 15, fontWeight: 700, marginTop: 12, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#444444", marginBottom: 14 },
  sectionHeading: { fontSize: 10, fontWeight: 700, marginTop: 12, marginBottom: 4 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  box: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderWidth: 0.75,
    borderColor: "#cccccc",
    borderRadius: 4,
    backgroundColor: "#fafafa",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#555555", fontSize: 9 },
  value: { fontWeight: 700, fontSize: 9.5 },
  disclaimer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#bbbbbb",
    fontSize: 8,
    color: "#444444",
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#666666",
  },
});

function formatDE(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function money(cents: number): string {
  return `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(cents / 100)} €`;
}

export function SimplifiedProofDocument({ data }: { data: SimplifiedProofPdfData }) {
  const hasExemption =
    data.exemptionDocumentType &&
    data.charitablePurposes &&
    data.taxOffice &&
    data.taxNumber &&
    data.exemptionNoticeDate;

  return (
    <Document title={SIMPLIFIED_PROOF_TITLE} author={data.organization.name} language="de">
      <Page size="A4" style={styles.page}>
        <Letterhead profile={{ ...data.organization, exemptionDocumentType: null }} />

        <Text style={styles.title}>{SIMPLIFIED_PROOF_TITLE}</Text>
        <Text style={styles.subtitle}>{SIMPLIFIED_PROOF_SUBTITLE}</Text>

        <Text style={styles.paragraph}>{SIMPLIFIED_PROOF_USAGE}</Text>

        <Text style={styles.sectionHeading}>{SIMPLIFIED_PROOF_PURPOSE_HEADING}</Text>
        {hasExemption ? (
          <Text style={styles.paragraph}>
            {exemptionParagraph({
              exemptionDocumentType: data.exemptionDocumentType!,
              purposes: data.charitablePurposes!,
              taxOffice: data.taxOffice!,
              taxNumber: data.taxNumber!,
              noticeDate: formatDE(data.exemptionNoticeDate!),
              period: data.exemptionNoticePeriod,
            })}
          </Text>
        ) : null}

        {data.charitablePurposes ? (
          <Text style={styles.paragraph}>{USAGE_SINGLE(data.charitablePurposes)}</Text>
        ) : null}

        {!data.membershipFeesDeductible ? (
          <Text style={styles.paragraph}>{NON_DEDUCTIBLE_TEXT}</Text>
        ) : null}

        {data.donation ? (
          <View style={styles.box} wrap={false}>
            <Text style={[styles.sectionHeading, { marginTop: 0 }]}>
              {SIMPLIFIED_PROOF_DONATION_HEADING}
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Referenz / Spendennr.</Text>
              <Text style={styles.value}>{data.donation.donationNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tag der Zuwendung</Text>
              <Text style={styles.value}>{formatDE(data.donation.receivedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Betrag</Text>
              <Text style={styles.value}>{money(data.donation.amountCents)}</Text>
            </View>
            {data.donation.purposeNote ? (
              <View style={styles.row}>
                <Text style={styles.label}>Verwendungszweck</Text>
                <Text style={styles.value}>{data.donation.purposeNote}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {data.creditor?.iban ? (
          <EpcQrBlock
            input={{
              beneficiaryName: data.organization.name,
              iban: data.creditor.iban,
              bic: data.creditor.bic,
              amountCents: data.donation?.amountCents ?? undefined,
              purposeCode: "CHAR",
              remittanceText: data.donation
                ? `Spende ${data.donation.donationNumber}`
                : "Spende",
            }}
            title={SIMPLIFIED_PROOF_QR_TITLE}
            caption={SIMPLIFIED_PROOF_QR_CAPTION}
          />
        ) : null}

        <Text style={styles.disclaimer}>{SIMPLIFIED_PROOF_DISCLAIMER}</Text>

        <View style={styles.footer} fixed>
          <Text>{data.organization.name}</Text>
          <Text>{`Stand: ${formatDE(data.issuedAt)}`}</Text>
        </View>
      </Page>
    </Document>
  );
}
