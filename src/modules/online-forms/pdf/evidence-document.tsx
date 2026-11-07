import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import type { EvidenceSnapshot } from "../services/evidence-store";

export type EvidencePdfLabels = {
  title: string;
  subtitle: string;
  sections: Record<"member" | "student" | "guardian" | "consents" | "privacyText" | "photoText" | "signature" | "evidence", string>;
  fields: Record<string, string>;
  consents: Record<string, string>;
  yes: string;
  no: string;
  meta: { documentKey: string; signer: string; signedAt: string; channel: string; textVersion: string; evidenceHash: string; note: string };
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSans", fontSize: 9, color: "#111827" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#4b5563", marginBottom: 12 },
  section: { marginTop: 12 },
  h2: { fontSize: 11, fontWeight: 700, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", paddingBottom: 2 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 150, color: "#4b5563" },
  value: { flex: 1 },
  consent: { flexDirection: "row", marginBottom: 6, gap: 6 },
  box: { width: 11, height: 11, borderWidth: 1, borderColor: "#111827", textAlign: "center", fontSize: 8, fontWeight: 700 },
  longText: { fontSize: 8, color: "#374151", lineHeight: 1.35 },
  signature: { width: 220, height: 80, objectFit: "contain", borderBottomWidth: 1, borderBottomColor: "#111827", marginTop: 4 },
  small: { fontSize: 7, color: "#6b7280" },
});

const display = (value: unknown, labels: EvidencePdfLabels) => {
  if (value === true) return labels.yes;
  if (value === false) return labels.no;
  if (Array.isArray(value)) return value.length ? value.map((item) => labels.consents[String(item)] ?? String(item)).join(", ") : "—";
  return value === null || value === undefined || value === "" ? "—" : String(value);
};

function Fields({ data, labels }: { data: Record<string, unknown>; labels: EvidencePdfLabels }) {
  return (
    <View>
      {Object.entries(data).filter(([key]) => key !== "sepaMandate" && key !== "photoConsent" && key !== "messagingConsents" && key !== "bulkMailOptOut").map(([key, value]) => (
        <View key={key} style={styles.row}><Text style={styles.label}>{labels.fields[key] ?? key}</Text><Text style={styles.value}>{display(value, labels)}</Text></View>
      ))}
    </View>
  );
}

function Consent({ checked, text }: { checked: boolean; text: string }) {
  return (
    <View style={styles.consent} wrap={false}>
      <Text style={styles.box}>{checked ? "X" : " "}</Text>
      <Text style={styles.value}>{text}</Text>
    </View>
  );
}

/** İmzalı online formun kanıt belgesi: girilen bilgiler, onaylar, metinler ve gömülü imza. */
export function EvidenceDocument({ snapshot, signature, organization, labels, dateTime }: { snapshot: EvidenceSnapshot; signature: string; organization: LetterheadProfile; labels: EvidencePdfLabels; dateTime: string }) {
  const { data, consents, texts } = snapshot;
  const channels = data.member?.messagingConsents ?? data.guardian?.messagingConsents;
  const optOut = data.member?.bulkMailOptOut ?? data.guardian?.bulkMailOptOut;
  return (
    <Document title={labels.title}>
      <Page size="A4" style={styles.page}>
        <Letterhead profile={organization} />
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.subtitle}>{labels.subtitle} · {snapshot.documentKey}</Text>

        {data.member ? <View style={styles.section}><Text style={styles.h2}>{labels.sections.member}</Text><Fields data={data.member} labels={labels} /></View> : null}
        {data.student ? <View style={styles.section}><Text style={styles.h2}>{labels.sections.student}</Text><Fields data={data.student} labels={labels} /></View> : null}
        {data.guardian ? <View style={styles.section}><Text style={styles.h2}>{labels.sections.guardian}</Text><Fields data={data.guardian} labels={labels} /></View> : null}

        <View style={styles.section}>
          <Text style={styles.h2}>{labels.sections.consents}</Text>
          <Consent checked={consents.includes("privacy")} text={texts.privacy} />
          {data.member || data.student ? <Consent checked={consents.includes("photo")} text={texts.photo} /> : null}
          {data.guardian ? <Consent checked={consents.includes("sepa")} text={texts.sepa} /> : null}
          {channels !== undefined ? (
            <View style={styles.row}><Text style={styles.label}>{labels.fields.messagingConsents}</Text><Text style={styles.value}>{display(channels, labels)}</Text></View>
          ) : null}
          {optOut !== undefined ? (
            <View style={styles.row}><Text style={styles.label}>{labels.fields.bulkMailOptOut}</Text><Text style={styles.value}>{display(optOut, labels)}</Text></View>
          ) : null}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>{labels.sections.signature}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
          <Image src={signature} style={styles.signature} />
          <Text>{snapshot.signerName} · {dateTime}</Text>
        </View>

        {texts.privacyLong ? <View style={styles.section}><Text style={styles.h2}>{labels.sections.privacyText}</Text><Text style={styles.longText}>{texts.privacyLong}</Text></View> : null}
        {texts.photoLong ? <View style={styles.section}><Text style={styles.h2}>{labels.sections.photoText}</Text><Text style={styles.longText}>{texts.photoLong}</Text></View> : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>{labels.sections.evidence}</Text>
          <View style={styles.row}><Text style={styles.label}>{labels.meta.documentKey}</Text><Text style={[styles.value, { fontWeight: 700 }]}>{snapshot.documentKey}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{labels.meta.signer}</Text><Text style={styles.value}>{snapshot.signerName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{labels.meta.signedAt}</Text><Text style={styles.value}>{dateTime} (UTC {snapshot.signedAt})</Text></View>
          <View style={styles.row}><Text style={styles.label}>{labels.meta.channel}</Text><Text style={styles.value}>{snapshot.channel} · {snapshot.sentTo}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{labels.meta.textVersion}</Text><Text style={[styles.value, styles.small]}>{snapshot.textVersion}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{labels.meta.evidenceHash}</Text><Text style={[styles.value, styles.small]}>{snapshot.evidenceHash}</Text></View>
          <Text style={[styles.small, { marginTop: 6 }]}>{labels.meta.note}</Text>
        </View>
      </Page>
    </Document>
  );
}
