/**
 * Pure-TypeScript EPC069-12 v002 (GiroCode / SEPA QR) payload builder and
 * ISO/IEC 18004 QR Code encoder (Byte mode, Error Correction Level M, Versions 1–13).
 *
 * Zero runtime dependencies, zero network egress — designed for deterministic
 * server-side embedding in React-PDF documents (invoices & simplified donation notices).
 */

export const EPC_QR_MAX_BYTES = 331;
export const EPC_QR_MAX_AMOUNT_CENTS = 99_999_999_999; // EUR 999,999,999.99

export type EpcQrInput = {
  /** Beneficiary / creditor name (1..70 chars). */
  beneficiaryName: string;
  /** Beneficiary IBAN (spaces allowed; validated via ISO 7064 Mod-97). */
  iban: string;
  /** Optional BIC (8 or 11 alphanumeric chars; optional in EPC069-12 v002 for EEA). */
  bic?: string | null;
  /** Optional amount in integer Euro cents (omitted when null/undefined/0). */
  amountCents?: number | null;
  /** Optional 4-char ISO 20022 purpose code (e.g. "CHAR" for charity). */
  purposeCode?: string | null;
  /** Optional unstructured remittance text (Verwendungszweck, max 140 chars). */
  remittanceText?: string | null;
  /** Optional beneficiary-to-originator hint (max 70 chars). */
  information?: string | null;
};

export type QrMatrix = {
  version: number;
  size: number;
  /** Row-major boolean grid: `true` = dark module, `false` = light module. */
  modules: boolean[][];
};

/** Normalizes an IBAN by removing whitespace and uppercasing. */
export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/** Validates IBAN syntax and ISO 7064 Mod-97-10 checksum. */
export function validateIban(iban: string): boolean {
  const clean = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i += 1) {
    const code = rearranged.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      remainder = (remainder * 10 + (code - 48)) % 97;
    } else if (code >= 65 && code <= 90) {
      const value = code - 55; // A=10 .. Z=35
      remainder = (remainder * 100 + value) % 97;
    } else {
      return false;
    }
  }
  return remainder === 1;
}

/** Normalizes BIC if valid (8 or 11 chars), otherwise returns empty string. */
export function normalizeBic(bic: string | null | undefined): string {
  if (!bic) return "";
  const clean = bic.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean) ? clean : "";
}

function sanitizeLine(value: string | null | undefined, maxChars: number): string {
  if (!value) return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function truncateToUtf8Bytes(value: string, maxBytes: number): string {
  if (maxBytes <= 0) return "";
  const encoder = new TextEncoder();
  if (encoder.encode(value).length <= maxBytes) return value;
  let result = "";
  let used = 0;
  for (const ch of value) {
    const size = encoder.encode(ch).length;
    if (used + size > maxBytes) break;
    result += ch;
    used += size;
  }
  return result.trimEnd();
}

/**
 * Builds an EPC069-12 v002 UTF-8 SEPA Credit Transfer QR payload.
 * Returns `null` if beneficiary name or IBAN is missing/invalid, or if amount is invalid.
 */
export function buildEpcQrPayload(input: EpcQrInput): string | null {
  const name = sanitizeLine(input.beneficiaryName, 70);
  const iban = normalizeIban(input.iban ?? "");
  if (!name || !validateIban(iban)) return null;

  const bic = normalizeBic(input.bic);
  let amountLine = "";
  if (input.amountCents !== null && input.amountCents !== undefined && input.amountCents !== 0) {
    if (
      !Number.isInteger(input.amountCents) ||
      input.amountCents < 1 ||
      input.amountCents > EPC_QR_MAX_AMOUNT_CENTS
    ) {
      return null;
    }
    amountLine = `EUR${(input.amountCents / 100).toFixed(2)}`;
  }

  const purpose = sanitizeLine(input.purposeCode, 4)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  let remittance = sanitizeLine(input.remittanceText, 140);
  let info = sanitizeLine(input.information, 70);

  const assemble = () => {
    const lines = [
      "BCD",
      "002",
      "1",
      "SCT",
      bic,
      name,
      iban,
      amountLine,
      purpose,
      "", // Structured RF reference unused when unstructured remittance text is provided
      remittance,
      info,
    ];
    // Trim trailing empty optional lines (keep at least through line 8 = amount or line 7 = IBAN).
    while (lines.length > 7 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines.join("\n");
  };

  let payload = assemble();
  if (utf8ByteLength(payload) > EPC_QR_MAX_BYTES && info) {
    const excess = utf8ByteLength(payload) - EPC_QR_MAX_BYTES;
    info = truncateToUtf8Bytes(info, Math.max(0, utf8ByteLength(info) - excess));
    payload = assemble();
  }
  if (utf8ByteLength(payload) > EPC_QR_MAX_BYTES && remittance) {
    const excess = utf8ByteLength(payload) - EPC_QR_MAX_BYTES;
    remittance = truncateToUtf8Bytes(remittance, Math.max(0, utf8ByteLength(remittance) - excess));
    payload = assemble();
  }
  if (utf8ByteLength(payload) > EPC_QR_MAX_BYTES) {
    return null;
  }
  return payload;
}

// ── ISO/IEC 18004 QR Code Encoder (EC Level M, Versions 1..13) ────────────────

type VersionSpec = {
  version: number;
  ecPerBlock: number;
  g1Blocks: number;
  g1DataCw: number;
  g2Blocks: number;
  g2DataCw: number;
  alignment: number[];
};

// ISO/IEC 18004 Table 9 (EC Level M) + Annex E alignment coordinates, Versions 1..13.
const VERSION_SPECS_M: VersionSpec[] = [
  { version: 1, ecPerBlock: 10, g1Blocks: 1, g1DataCw: 16, g2Blocks: 0, g2DataCw: 0, alignment: [] },
  { version: 2, ecPerBlock: 16, g1Blocks: 1, g1DataCw: 28, g2Blocks: 0, g2DataCw: 0, alignment: [6, 18] },
  { version: 3, ecPerBlock: 26, g1Blocks: 1, g1DataCw: 44, g2Blocks: 0, g2DataCw: 0, alignment: [6, 22] },
  { version: 4, ecPerBlock: 18, g1Blocks: 2, g1DataCw: 32, g2Blocks: 0, g2DataCw: 0, alignment: [6, 26] },
  { version: 5, ecPerBlock: 24, g1Blocks: 2, g1DataCw: 43, g2Blocks: 0, g2DataCw: 0, alignment: [6, 30] },
  { version: 6, ecPerBlock: 16, g1Blocks: 4, g1DataCw: 27, g2Blocks: 0, g2DataCw: 0, alignment: [6, 34] },
  { version: 7, ecPerBlock: 18, g1Blocks: 4, g1DataCw: 31, g2Blocks: 0, g2DataCw: 0, alignment: [6, 22, 38] },
  { version: 8, ecPerBlock: 22, g1Blocks: 2, g1DataCw: 38, g2Blocks: 2, g2DataCw: 39, alignment: [6, 24, 42] },
  { version: 9, ecPerBlock: 22, g1Blocks: 3, g1DataCw: 36, g2Blocks: 2, g2DataCw: 37, alignment: [6, 26, 46] },
  { version: 10, ecPerBlock: 26, g1Blocks: 4, g1DataCw: 43, g2Blocks: 1, g2DataCw: 44, alignment: [6, 28, 50] },
  { version: 11, ecPerBlock: 30, g1Blocks: 1, g1DataCw: 50, g2Blocks: 4, g2DataCw: 51, alignment: [6, 30, 54] },
  { version: 12, ecPerBlock: 22, g1Blocks: 6, g1DataCw: 36, g2Blocks: 2, g2DataCw: 37, alignment: [6, 32, 58] },
  { version: 13, ecPerBlock: 22, g1Blocks: 8, g1DataCw: 37, g2Blocks: 1, g2DataCw: 38, alignment: [6, 34, 62] },
];

// GF(256) arithmetic with primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1).
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEc(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecLen - 1; j += 1) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    rem[ecLen - 1] = gfMul(gen[ecLen], factor);
  }
  return rem;
}

function selectVersionForBytes(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS_M) {
    const totalDataCw = spec.g1Blocks * spec.g1DataCw + spec.g2Blocks * spec.g2DataCw;
    const headerBits = 4 + (spec.version <= 9 ? 8 : 16);
    const maxBytes = Math.floor((totalDataCw * 8 - headerBits) / 8);
    if (byteLength <= maxBytes) return spec;
  }
  throw new Error(`QR payload exceeds Version 13-M capacity (${EPC_QR_MAX_BYTES} bytes): got ${byteLength}`);
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const totalDataCw = spec.g1Blocks * spec.g1DataCw + spec.g2Blocks * spec.g2DataCw;
  const totalBits = totalDataCw * 8;
  const bits: number[] = [];

  const pushBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) {
      bits.push((value >>> i) & 1);
    }
  };

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4);
  // Character count indicator: 8 bits (V1-9) or 16 bits (V10-13)
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  // Payload bytes
  for (const b of bytes) pushBits(b, 8);
  // Terminator (up to 4 zero bits)
  const terminatorLen = Math.min(4, totalBits - bits.length);
  for (let i = 0; i < terminatorLen; i += 1) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = new Uint8Array(totalDataCw);
  const dataByteCount = bits.length / 8;
  for (let i = 0; i < dataByteCount; i += 1) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    codewords[i] = byte;
  }
  // Pad bytes alternating 0xEC, 0x11
  for (let i = dataByteCount; i < totalDataCw; i += 1) {
    codewords[i] = (i - dataByteCount) % 2 === 0 ? 0xec : 0x11;
  }
  return codewords;
}

function interleaveBlocks(dataCw: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.g1Blocks; i += 1) {
    const block = dataCw.slice(offset, offset + spec.g1DataCw);
    offset += spec.g1DataCw;
    dataBlocks.push(block);
    ecBlocks.push(rsComputeEc(block, spec.ecPerBlock));
  }
  for (let i = 0; i < spec.g2Blocks; i += 1) {
    const block = dataCw.slice(offset, offset + spec.g2DataCw);
    offset += spec.g2DataCw;
    dataBlocks.push(block);
    ecBlocks.push(rsComputeEc(block, spec.ecPerBlock));
  }

  const maxDataLen = Math.max(spec.g1DataCw, spec.g2DataCw);
  const out: number[] = [];
  for (let col = 0; col < maxDataLen; col += 1) {
    for (const block of dataBlocks) {
      if (col < block.length) out.push(block[col]);
    }
  }
  for (let col = 0; col < spec.ecPerBlock; col += 1) {
    for (const block of ecBlocks) {
      out.push(block[col]);
    }
  }
  return new Uint8Array(out);
}

function bchFormatBits(maskPattern: number): number {
  // EC Level M = 00 (2 bits) + 3-bit maskPattern
  const data = (0b00 << 3) | (maskPattern & 0b111);
  let rem = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersionBits(version: number): number {
  let rem = version << 12;
  for (let i = 17; i >= 12; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
  }
  return (version << 12) | rem;
}

function placeFunctionPatterns(spec: VersionSpec): {
  modules: boolean[][];
  isFunction: boolean[][];
} {
  const size = spec.version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + 1-module separators
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (onBorder || inCenter));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const centers = spec.alignment;
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = 0; j < centers.length; j += 1) {
      const isCorner =
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0);
      if (isCorner) continue;
      const cr = centers[i];
      const cc = centers[j];
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(cr + dr, cc + dc, dist === 2 || dist === 0);
        }
      }
    }
  }

  // Reserve format info areas + fixed dark module
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    isFunction[8][size - 1 - i] = true;
    if (i < 7) isFunction[size - 1 - i][8] = true;
  }
  setFunc(spec.version * 4 + 9, 8, true);

  // Version info (V7+)
  if (spec.version >= 7) {
    const bits = bchVersionBits(spec.version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) === 1;
      const row = Math.floor(i / 3);
      const col = size - 11 + (i % 3);
      setFunc(row, col, dark);
      setFunc(col, row, dark);
    }
  }

  return { modules, isFunction };
}

function drawFormatInfo(modules: boolean[][], maskPattern: number): void {
  const size = modules.length;
  const bits = bchFormatBits(maskPattern);
  const bit = (i: number) => ((bits >>> i) & 1) === 1;

  // Around top-left finder
  const tlRow = [8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 3, 2, 1, 0];
  const tlCol = [0, 1, 2, 3, 4, 5, 7, 8, 8, 8, 8, 8, 8, 8, 8];
  for (let i = 0; i < 15; i += 1) {
    modules[tlRow[i]][tlCol[i]] = bit(14 - i);
  }

  // Bottom-left (bits 14..8) & top-right (bits 7..0)
  for (let i = 0; i < 7; i += 1) {
    modules[size - 1 - i][8] = bit(14 - i);
  }
  for (let i = 0; i < 8; i += 1) {
    modules[8][size - 8 + i] = bit(7 - i);
  }
}

function maskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function placeCodewords(
  baseModules: boolean[][],
  isFunction: boolean[][],
  codewords: Uint8Array,
  mask: number,
): boolean[][] {
  const size = baseModules.length;
  const modules = baseModules.map((row) => row.slice());

  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing column
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = right - dx;
        if (isFunction[r][c]) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          const cw = codewords[bitIndex >>> 3];
          dark = ((cw >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex += 1;
        }
        modules[r][c] = maskCondition(mask, r, c) ? !dark : dark;
      }
    }
    upward = !upward;
  }

  drawFormatInfo(modules, mask);
  return modules;
}

function computePenalty(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  // Rule 1: 5+ adjacent modules of same color in row or col
  for (let r = 0; r < size; r += 1) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += runLen - 2;
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += runLen - 2;
  }
  for (let c = 0; c < size; c += 1) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += runLen - 2;
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += runLen - 2;
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 3: 1:1:3:1:1 finder-like patterns with 4 light modules on either side
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c <= size - 11; c += 1) {
      let m1 = true;
      let m2 = true;
      for (let k = 0; k < 11; k += 1) {
        if (modules[r][c + k] !== p1[k]) m1 = false;
        if (modules[r][c + k] !== p2[k]) m2 = false;
      }
      if (m1) penalty += 40;
      if (m2) penalty += 40;
    }
  }
  for (let c = 0; c < size; c += 1) {
    for (let r = 0; r <= size - 11; r += 1) {
      let m1 = true;
      let m2 = true;
      for (let k = 0; k < 11; k += 1) {
        if (modules[r + k][c] !== p1[k]) m1 = false;
        if (modules[r + k][c] !== p2[k]) m2 = false;
      }
      if (m1) penalty += 40;
      if (m2) penalty += 40;
    }
  }

  // Rule 4: balance of dark modules
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (modules[r][c]) darkCount += 1;
    }
  }
  const total = size * size;
  const k = Math.floor(Math.abs(darkCount * 20 - total * 10) / total);
  penalty += k * 10;

  return penalty;
}

/** Encodes a UTF-8 string into an ISO/IEC 18004 QR Code matrix (Byte mode, EC Level M). */
export function encodeQrMatrix(payload: string): QrMatrix {
  const bytes = new TextEncoder().encode(payload);
  const spec = selectVersionForBytes(bytes.length);
  const dataCw = encodeDataCodewords(bytes, spec);
  const interleaved = interleaveBlocks(dataCw, spec);
  const { modules: baseModules, isFunction } = placeFunctionPatterns(spec);

  let bestModules: boolean[][] | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = placeCodewords(baseModules, isFunction, interleaved, mask);
    const penalty = computePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestModules = candidate;
    }
  }

  return {
    version: spec.version,
    size: spec.version * 4 + 17,
    modules: bestModules!,
  };
}

/**
 * Converts a QR matrix into a compact SVG path string with horizontal run merging
 * and the ISO/IEC 18004 quiet zone (default 4 modules).
 */
export function qrMatrixToSvgPath(matrix: QrMatrix, quietZone = 4): {
  viewBoxSize: number;
  path: string;
} {
  const parts: string[] = [];
  for (let r = 0; r < matrix.size; r += 1) {
    let c = 0;
    while (c < matrix.size) {
      if (!matrix.modules[r][c]) {
        c += 1;
        continue;
      }
      const start = c;
      while (c < matrix.size && matrix.modules[r][c]) c += 1;
      const width = c - start;
      parts.push(`M${start + quietZone} ${r + quietZone}h${width}v1h-${width}z`);
    }
  }
  return {
    viewBoxSize: matrix.size + quietZone * 2,
    path: parts.join(""),
  };
}
