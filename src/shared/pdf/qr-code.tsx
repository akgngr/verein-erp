import { Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

import {
  buildEpcQrPayload,
  encodeQrMatrix,
  qrMatrixToSvgPath,
  type EpcQrInput,
} from "./epc-qr";

const styles = StyleSheet.create({
  block: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 8,
    borderWidth: 0.75,
    borderColor: "#d4d4d8",
    borderRadius: 4,
  },
  meta: {
    flex: 1,
    fontSize: 8,
    lineHeight: 1.4,
    color: "#333333",
  },
  heading: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#111111",
    marginBottom: 2,
  },
  hint: {
    fontSize: 7.5,
    color: "#555555",
  },
});

/** Renders any QR payload as a crisp single-path React-PDF vector `<Svg>`. */
export function PdfQrCode({
  payload,
  size = 76,
}: {
  payload: string;
  size?: number;
}) {
  const matrix = encodeQrMatrix(payload);
  const { viewBoxSize, path } = qrMatrixToSvgPath(matrix, 4);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
      <Rect x={0} y={0} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}

/**
 * Renders a localized GiroCode / EPC-QR payment slip block inside a React-PDF page.
 * Returns `null` silently if the IBAN/beneficiary cannot produce a valid EPC069-12 payload.
 */
export function EpcQrBlock({
  input,
  title,
  caption,
  size = 76,
}: {
  input: EpcQrInput;
  title: string;
  caption: string;
  size?: number;
}) {
  const payload = buildEpcQrPayload(input);
  if (!payload) return null;

  return (
    <View style={styles.block} wrap={false}>
      <PdfQrCode payload={payload} size={size} />
      <View style={styles.meta}>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.hint}>{caption}</Text>
      </View>
    </View>
  );
}
