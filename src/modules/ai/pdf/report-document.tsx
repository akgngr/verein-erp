import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { Letterhead, type LetterheadProfile } from "@/shared/pdf/letterhead";

import { parseMarkdown } from "../services/markdown";

/**
 * Asistan raporu PDF'i: sohbetteki markdown (başlık, paragraf, liste, tablo) dernek antetiyle.
 * Ham HTML yok; **kalın** desteklenir, bağlantılar yalnızca metin olarak basılır.
 */
export type AiReportPdfData = {
  organization: LetterheadProfile;
  title: string;
  markdown: string;
  createdAt: Date;
  strings: { createdAt: string; footer: (page: number, total: number) => string; note: string };
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "NotoSans", fontSize: 9.5, color: "#111111" },
  title: { fontSize: 14, fontWeight: 700, letterSpacing: 0.5, borderBottomWidth: 1.5, borderBottomColor: "#111111", paddingBottom: 6, marginBottom: 4 },
  meta: { fontSize: 8.5, color: "#555555", marginBottom: 12 },
  heading: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  paragraph: { marginBottom: 6, lineHeight: 1.45 },
  listItem: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 14 },
  table: { borderWidth: 0.75, borderColor: "#999999", marginVertical: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cccccc" },
  headerRow: { backgroundColor: "#eeeeee" },
  cell: { flex: 1, paddingHorizontal: 4, paddingVertical: 3, fontSize: 8.5 },
  note: { marginTop: 14, fontSize: 7.5, color: "#666666" },
  footer: { position: "absolute", bottom: 24, right: 44, fontSize: 8, color: "#555555" },
});

/** Satır içi: **kalın** parçaları, [metin](yol) → metin, `kod` → metin. */
function Inline({ text }: { text: string }) {
  const plain = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/`([^`]+)`/g, "$1");
  const parts = plain.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={index} style={{ fontWeight: 700 }}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        ),
      )}
    </>
  );
}

export function AiReportDocument({ data }: { data: AiReportPdfData }) {
  const created = data.createdAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  return (
    <Document title={data.title} author={data.organization.name}>
      <Page size="A4" style={styles.page} wrap>
        <Letterhead profile={data.organization} />
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.meta}>{`${data.strings.createdAt}: ${created}`}</Text>
        {parseMarkdown(data.markdown).map((block, index) => {
          switch (block.type) {
            case "heading":
              return (
                <Text key={index} style={styles.heading}>
                  <Inline text={block.text} />
                </Text>
              );
            case "list":
              return (
                <View key={index} style={{ marginBottom: 6 }}>
                  {block.items.map((item, position) => (
                    <View key={position} style={styles.listItem} wrap={false}>
                      <Text style={styles.bullet}>{block.ordered ? `${position + 1}.` : "•"}</Text>
                      <Text style={{ flex: 1 }}>
                        <Inline text={item} />
                      </Text>
                    </View>
                  ))}
                </View>
              );
            case "table":
              return (
                <View key={index} style={styles.table}>
                  <View style={[styles.row, styles.headerRow]} fixed>
                    {block.header.map((cell, column) => (
                      <Text key={column} style={[styles.cell, { fontWeight: 700, textAlign: block.align[column] }]}>
                        <Inline text={cell} />
                      </Text>
                    ))}
                  </View>
                  {block.rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row} wrap={false}>
                      {row.map((cell, column) => (
                        <Text key={column} style={[styles.cell, { textAlign: block.align[column] }]}>
                          <Inline text={cell} />
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            default:
              return (
                <Text key={index} style={styles.paragraph}>
                  <Inline text={block.text} />
                </Text>
              );
          }
        })}
        <Text style={styles.note}>{data.strings.note}</Text>
        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => data.strings.footer(pageNumber, totalPages)} />
      </Page>
    </Document>
  );
}
