import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { RecipientSnapshot } from "../services/confirmation-builder";

/** Anlage satırı — snapshot'tan taşınır (bağımsız tip; § 13 md. 13). */
export type AnlageItemRow = {
  position: number;
  itemType: "DONATION" | "MEMBER_PAYMENT";
  sourceId: string;
  itemDate: Date;
  amountCents: number;
  label: string;
  waived: boolean;
};
import {
  ATTACHMENT_COL_AMOUNT,
  ATTACHMENT_COL_DATE,
  ATTACHMENT_COL_KIND,
  ATTACHMENT_COL_POSITION,
  ATTACHMENT_COL_WAIVER,
  ATTACHMENT_TITLE,
  ATTACHMENT_TOTAL_ROW,
  COLLECTIVE_NO_OTHER_CONFIRMATIONS,
  LABEL_AMOUNT_DIGITS,
  LABEL_AMOUNT_WORDS,
  LABEL_DAY_OF_DONATION,
  LABEL_DAY_SEE_ATTACHMENT,
  LABEL_ISSUER,
  LABEL_KIND_SEE_ATTACHMENT,
  LABEL_PERIOD,
  LABEL_PLACE_DATE_DE,
  LABEL_RECIPIENT,
  LABEL_TOTAL_DIGITS,
  LABEL_WAIVER,
  NON_DEDUCTIBLE_HEADING,
  NON_DEDUCTIBLE_TEXT,
  NOTICE_HEADING,
  NOTICE_LIABILITY,
  NOTICE_VALIDITY,
  PREVIEW_MARK,
  SUBTITLE_10B,
  TITLE_COLLECTIVE_DONATION,
  TITLE_COLLECTIVE_FEE,
  TITLE_SINGLE_DONATION,
  TITLE_SINGLE_FEE,
  USAGE_COLLECTIVE,
  USAGE_SINGLE,
  WAIVER_NO,
  WAIVER_YES,
  exemptionParagraph,
  type ExemptionDocumentTypeKey,
} from "./template-de";

/**
 * RESMİ BAĞIŞ BİLDİRİMİ PDF (Faz 5, § 13) — YALNIZCA ALMANCA (KARAR: hukuki
 * şablon Almanca; ?lang= YOKTUR). A4 dikey, siyah-beyaz, süs yok. Yalnızca
 * o vakit için geçerli olan ögeler basılır. İmza satırı ASLA kaldırılmaz.
 */

export type ConfirmationPdfData = {
  /** Depolanan PDF için organization adı/anteti — issuer snapshot'tan kurulur. */
  organization: LetterheadProfile;
  /** "ZB-2026-0001" (önizlemede null — numara basılmaz). */
  confirmationNumber: string | null;
  /** Önizleme: her sayfada büyük MUSTER işareti; depolanmaz. */
  isPreview: boolean;
  kind: "SINGLE" | "COLLECTIVE";
  content: "DONATION" | "MEMBERSHIP_FEE";
  recipient: RecipientSnapshot;
  totalCents: number;
  amountInWords: string;
  periodFrom: Date;
  periodTo: Date;
  waived: boolean;
  membershipFeesDeductible: boolean;
  /** Ögeler (Anlage; yalnız COLLECTIVE). */
  items?: AnlageItemRow[];
  issuedPlace: string;
  /** Üretim tarihi (dd.MM.yyyy basılır); önizlemede bugün. */
  issueDate: Date;
  /** Anlage tarihleri (Sammelbestätigung "vom …"). */
  attachment: boolean;
  /** § 13 md. 6/7 metinleri snapshot'tan okunur (değişmez veri). */
  issuerSnapshotData: Record<string, unknown>;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "NotoSans",
    fontWeight: 400,
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111111",
  },
  previewMark: {
    fontSize: 12,
    fontWeight: 700,
    color: "#b91c1c",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#b91c1c",
    padding: 6,
    marginBottom: 10,
    textAlign: "center",
  },
  smallLabel: { fontSize: 8, color: "#555555", marginBottom: 2 },
  issuerBlock: { marginBottom: 14 },
  title: { fontSize: 14, fontWeight: 700, marginTop: 10, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#333333", marginBottom: 12 },
  sectionLabel: { fontSize: 9, fontWeight: 700, marginTop: 10, marginBottom: 3 },
  text: { marginBottom: 4 },
  amountLine: { flexDirection: "row", marginTop: 4 },
  amountLabel: { width: 230, fontSize: 9, color: "#555555" },
  amountValue: { flex: 1, fontWeight: 700 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  checkbox: {
    width: 12,
    height: 12,
    borderStyle: "solid",
    borderWidth: 0.75,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: { fontSize: 9, fontWeight: 700, lineHeight: 1.1 },
  checkboxLabel: { fontSize: 10 },
  waiverLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  waiverText: { flex: 1, fontSize: 9.5 },
  paragraph: { marginTop: 8, textAlign: "justify" },
  nonDeductibleHeading: { fontSize: 9, fontWeight: 700, marginTop: 12 },
  signatureRow: { flexDirection: "row", marginTop: 34 },
  signaturePlace: { fontSize: 10 },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: "#111111", width: 220, marginTop: 36 },
  signatureCaption: { fontSize: 8, color: "#555555", marginTop: 3, width: 220 },
  noticeBlock: { marginTop: 20 },
  noticeText: { fontSize: 8, color: "#333333", textAlign: "justify", marginBottom: 3 },
  footerLeft: { position: "absolute", bottom: 28, left: 48, fontSize: 8.5, color: "#555555" },
  footerRight: { position: "absolute", bottom: 28, right: 48, fontSize: 8.5, color: "#555555" },
  table: { borderWidth: 0.75, borderColor: "#111111", marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb" },
  headerRow: { backgroundColor: "#eeeeee" },
  cell: { padding: 3, fontSize: 8.5 },
  headerCell: { fontWeight: 700, fontSize: 8.5 },
  totalRow: { backgroundColor: "#f5f5f5" },
  totalLabel: { fontWeight: 700 },
  recipientBlock: { marginTop: 2 },
});

function formatDE(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function money(cents: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(cents / 100);
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.checkboxRow}>
      <View style={styles.checkbox}>
        {checked ? <Text style={styles.checkboxMark}>X</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </View>
  );
}

export function ConfirmationBody({ data }: { data: ConfirmationPdfData }) {
  const isCollective = data.kind === "COLLECTIVE";
  const title =
    data.content === "DONATION"
      ? isCollective
        ? TITLE_COLLECTIVE_DONATION
        : TITLE_SINGLE_DONATION
      : isCollective
        ? TITLE_COLLECTIVE_FEE
        : TITLE_SINGLE_FEE;

  const issuer = data.organization;
  const snapshot = data.issuerSnapshotData;
  const documentType = snapshot.exemptionDocumentType as ExemptionDocumentTypeKey | null;

  return (
    <>
      {data.isPreview ? <Text style={styles.previewMark}>{PREVIEW_MARK}</Text> : null}

      {/* 1) Aussteller */}
      <Text style={styles.smallLabel}>{LABEL_ISSUER}</Text>
      <View style={styles.issuerBlock}>
        <Letterhead profile={{ ...issuer, exemptionDocumentType: null }} />
      </View>

      {/* 2) Başlık + alt cümle */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{SUBTITLE_10B}</Text>

      {/* 3) Alıcı */}
      <Text style={styles.sectionLabel}>{LABEL_RECIPIENT}</Text>
      <View style={styles.recipientBlock}>
        <Text style={styles.text}>{data.recipient.name}</Text>
        <Text style={styles.text}>{data.recipient.street}</Text>
        <Text style={styles.text}>
          {data.recipient.postalCode} {data.recipient.city}
          {data.recipient.country ? ` — ${data.recipient.country}` : ""}
        </Text>
      </View>

      {/* 4) Tutar / dönem */}
      {isCollective ? (
        <>
          <View style={styles.amountLine}>
            <Text style={styles.amountLabel}>{LABEL_TOTAL_DIGITS}</Text>
            <Text style={styles.amountValue}>{money(data.totalCents)} €</Text>
          </View>
          <View style={styles.amountLine}>
            <Text style={styles.amountLabel}>{LABEL_AMOUNT_WORDS}</Text>
            <Text style={styles.amountValue}>{data.amountInWords}</Text>
          </View>
          <View style={styles.amountLine}>
            <Text style={styles.amountLabel}>{LABEL_PERIOD}</Text>
            <Text style={styles.amountValue}>
              {formatDE(data.periodFrom)} bis {formatDE(data.periodTo)}
            </Text>
          </View>
          <Text style={styles.text}>{LABEL_KIND_SEE_ATTACHMENT}</Text>
          <Text style={styles.text}>{LABEL_DAY_SEE_ATTACHMENT}</Text>
        </>
      ) : (
        <>
          <View style={styles.amountLine}>
            <Text style={styles.amountLabel}>{LABEL_AMOUNT_DIGITS}</Text>
            <Text style={styles.amountValue}>{money(data.totalCents)} €</Text>
          </View>
          <View style={styles.amountLine}>
            <Text style={styles.amountLabel}>{LABEL_AMOUNT_WORDS}</Text>
            <Text style={styles.amountValue}>{data.amountInWords}</Text>
          </View>
          <View style={styles.amountLine}>
            <Text style={styles.amountLabel}>{LABEL_DAY_OF_DONATION}</Text>
            <Text style={styles.amountValue}>{formatDE(data.periodFrom)}</Text>
          </View>
        </>
      )}

      {/* 5) Aufwandsspende satırı — HER para bildiriminde (§ 13 md. 5). */}
      <View style={styles.waiverLine}>
        <Text style={styles.waiverText}>{LABEL_WAIVER}</Text>
        <Checkbox checked={data.waived} label={WAIVER_YES} />
        <Checkbox checked={!data.waived} label={WAIVER_NO} />
      </View>

      {/* 6) Muafiyet paragrafı */}
      {documentType && snapshot.charitablePurposes && snapshot.taxOffice && snapshot.taxNumber ? (
        <Text style={styles.paragraph}>
          {exemptionParagraph({
            exemptionDocumentType: documentType,
            purposes: String(snapshot.charitablePurposes),
            taxOffice: String(snapshot.taxOffice),
            taxNumber: String(snapshot.taxNumber),
            noticeDate: snapshot.exemptionNoticeDate
              ? formatDE(new Date(`${String(snapshot.exemptionNoticeDate)}T00:00:00Z`))
              : "",
            period: (snapshot.exemptionNoticePeriod as string | null) ?? null,
          })}
        </Text>
      ) : null}

      {/* 7) Kullanım cümlesi */}
      {snapshot.charitablePurposes ? (
        <Text style={styles.paragraph}>
          {isCollective
            ? USAGE_COLLECTIVE(String(snapshot.charitablePurposes))
            : USAGE_SINGLE(String(snapshot.charitablePurposes))}
        </Text>
      ) : null}

      {/* 8) Sammelbestätigung ek cümlesi */}
      {isCollective ? <Text style={styles.paragraph}>{COLLECTIVE_NO_OTHER_CONFIRMATIONS}</Text> : null}

      {/* 9) Aidat indirilemez bloğu (yalnız DONATION + bayrak false). */}
      {data.content === "DONATION" && !data.membershipFeesDeductible ? (
        <>
          <Text style={styles.nonDeductibleHeading}>{NON_DEDUCTIBLE_HEADING}</Text>
          <Text style={styles.paragraph}>{NON_DEDUCTIBLE_TEXT}</Text>
        </>
      ) : null}

      {/* 10) İmza alanı (ASLA kaldırılmaz — § 13 md. 10). */}
      <View style={styles.signatureRow}>
        <View>
          <Text style={styles.signaturePlace}>
            {data.issuedPlace}, {formatDE(data.issueDate)}
          </Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureCaption}>{LABEL_PLACE_DATE_DE}</Text>
        </View>
      </View>

      {/* 11) Hinweis bloğu */}
      <View style={styles.noticeBlock}>
        <Text style={styles.noticeText}>{NOTICE_HEADING}</Text>
        <Text style={styles.noticeText}>{NOTICE_LIABILITY}</Text>
        <Text style={styles.noticeText}>{NOTICE_VALIDITY}</Text>
      </View>
    </>
  );
}

/** Ana belge: sayfa 1 bildirim; COLLECTIVE ise sonraki sayfa(lar) Anlage (§ 13 md. 13). */
export function ConfirmationDocument({ data }: { data: ConfirmationPdfData }) {
  const isCollective = data.kind === "COLLECTIVE";
  const items = data.items ?? [];
  const total = data.totalCents;
  return (
    <Document
      title={data.confirmationNumber ?? "Muster"}
      author={data.organization.name}
      language="de"
    >
      <Page size="A4" style={styles.page} wrap>
        <ConfirmationBody data={data} />
        <Text style={styles.footerLeft} fixed>
          {data.confirmationNumber ?? ""}
        </Text>
        <Text
          style={styles.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
        />
      </Page>

      {isCollective && data.attachment && items.length > 0 ? (
        <Page size="A4" style={styles.page} wrap>
          {data.isPreview ? <Text style={styles.previewMark}>{PREVIEW_MARK}</Text> : null}
          <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            {ATTACHMENT_TITLE(formatDE(data.issueDate))}
          </Text>
          <Text style={styles.text}>{data.recipient.name}</Text>
          <Text style={{ fontSize: 9, color: "#555555", marginBottom: 6 }}>
            {data.confirmationNumber ?? ""}
          </Text>

          <View style={styles.table} wrap>
            <View style={[styles.row, styles.headerRow]} fixed>
              <Text style={[styles.cell, styles.headerCell, { width: 40 }]}>{ATTACHMENT_COL_POSITION}</Text>
              <Text style={[styles.cell, styles.headerCell, { width: 90 }]}>{ATTACHMENT_COL_DATE}</Text>
              <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>{ATTACHMENT_COL_KIND}</Text>
              <Text style={[styles.cell, styles.headerCell, { width: 70, textAlign: "right" }]}>
                {ATTACHMENT_COL_AMOUNT}
              </Text>
              <Text style={[styles.cell, styles.headerCell, { width: 60, textAlign: "center" }]}>
                {ATTACHMENT_COL_WAIVER}
              </Text>
            </View>
            {items.map((item) => (
              <View key={item.sourceId} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: 40 }]}>{item.position}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{formatDE(item.itemDate)}</Text>
                <Text style={[styles.cell, { flex: 1 }]}>{item.label}</Text>
                <Text style={[styles.cell, { width: 70, textAlign: "right" }]}>
                  {money(item.amountCents)} €
                </Text>
                <Text style={[styles.cell, { width: 60, textAlign: "center" }]}>
                  {item.waived ? "Ja" : "Nein"}
                </Text>
              </View>
            ))}
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.cell, styles.totalLabel, { width: 130 }]}>
                {ATTACHMENT_TOTAL_ROW}
              </Text>
              <Text style={[styles.cell, { flex: 1 }]} />
              <Text style={[styles.cell, styles.totalLabel, { width: 70, textAlign: "right" }]}>
                {money(total)} €
              </Text>
              <Text style={[styles.cell, { width: 60 }]} />
            </View>
          </View>

          <Text style={styles.footerLeft} fixed>
            {data.confirmationNumber ?? ""}
          </Text>
          <Text
            style={styles.footerRight}
            fixed
            render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
          />
        </Page>
      ) : null}
    </Document>
  );
}
