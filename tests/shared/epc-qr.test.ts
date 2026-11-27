import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildEpcQrPayload,
  encodeQrMatrix,
  EPC_QR_MAX_BYTES,
  normalizeBic,
  normalizeIban,
  qrMatrixToSvgPath,
  validateIban,
} from "@/shared/pdf/epc-qr";

// Minimal ISO/IEC 18004 format-bit + payload round-trip decoder for verification.
function verifyAndDecodeQrMatrix(matrix: ReturnType<typeof encodeQrMatrix>): {
  mask: number;
  ecLevelBits: number;
  payload: string;
} {
  const { version, size, modules } = matrix;
  assert.equal(size, version * 4 + 17);

  // Verify fixed dark module at (4 * version + 9, 8)
  assert.equal(modules[4 * version + 9][8], true, "fixed dark module must be dark");

  // Verify timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    assert.equal(modules[6][i], i % 2 === 0, `horizontal timing at ${i}`);
    assert.equal(modules[i][6], i % 2 === 0, `vertical timing at ${i}`);
  }

  // Read top-left format info (15 bits) and verify BCH(15,5) syndrome == 0
  const tlRow = [8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 3, 2, 1, 0];
  const tlCol = [0, 1, 2, 3, 4, 5, 7, 8, 8, 8, 8, 8, 8, 8, 8];
  let formatRaw = 0;
  for (let i = 0; i < 15; i += 1) {
    formatRaw = (formatRaw << 1) | (modules[tlRow[i]][tlCol[i]] ? 1 : 0);
  }
  const formatUnmasked = formatRaw ^ 0x5412;
  let rem = formatUnmasked;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  }
  assert.equal(rem, 0, "format BCH(15,5) remainder must be 0");

  const ecLevelBits = (formatUnmasked >>> 13) & 0b11;
  const mask = (formatUnmasked >>> 10) & 0b111;
  assert.equal(ecLevelBits, 0b00, "EPC-QR requires EC Level M (00)");

  // Verify bottom-left + top-right format copy matches top-left copy identically
  let formatCopy = 0;
  for (let i = 0; i < 7; i += 1) {
    formatCopy = (formatCopy << 1) | (modules[size - 1 - i][8] ? 1 : 0);
  }
  for (let i = 0; i < 8; i += 1) {
    formatCopy = (formatCopy << 1) | (modules[8][size - 8 + i] ? 1 : 0);
  }
  assert.equal(formatCopy, formatRaw, "both format info copies must match");

  // If version >= 7, verify BCH(18,6) version info
  if (version >= 7) {
    let verBits = 0;
    for (let i = 17; i >= 0; i -= 1) {
      const row = Math.floor(i / 3);
      const col = size - 11 + (i % 3);
      verBits = (verBits << 1) | (modules[row][col] ? 1 : 0);
    }
    assert.equal(verBits >>> 12, version, "version info prefix must match version");
    let vRem = verBits;
    for (let i = 17; i >= 12; i -= 1) {
      if ((vRem >>> i) & 1) vRem ^= 0x1f25 << (i - 12);
    }
    assert.equal(vRem, 0, "version BCH(18,6) remainder must be 0");
  }

  // Reconstruct function mask to extract unmasked bitstream for Version 1-13
  const alignTable: Record<number, number[]> = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
    7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
    11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62],
  };
  const blockTable: Record<number, { g1: number; g1Cw: number; g2: number; g2Cw: number; ec: number }> = {
    1: { g1: 1, g1Cw: 16, g2: 0, g2Cw: 0, ec: 10 },
    2: { g1: 1, g1Cw: 28, g2: 0, g2Cw: 0, ec: 16 },
    3: { g1: 1, g1Cw: 44, g2: 0, g2Cw: 0, ec: 26 },
    4: { g1: 2, g1Cw: 32, g2: 0, g2Cw: 0, ec: 18 },
    5: { g1: 2, g1Cw: 43, g2: 0, g2Cw: 0, ec: 24 },
    6: { g1: 4, g1Cw: 27, g2: 0, g2Cw: 0, ec: 16 },
    7: { g1: 4, g1Cw: 31, g2: 0, g2Cw: 0, ec: 18 },
    8: { g1: 2, g1Cw: 38, g2: 2, g2Cw: 39, ec: 22 },
    9: { g1: 3, g1Cw: 36, g2: 2, g2Cw: 37, ec: 22 },
    10: { g1: 4, g1Cw: 43, g2: 1, g2Cw: 44, ec: 26 },
    11: { g1: 1, g1Cw: 50, g2: 4, g2Cw: 51, ec: 30 },
    12: { g1: 6, g1Cw: 36, g2: 2, g2Cw: 37, ec: 22 },
    13: { g1: 8, g1Cw: 37, g2: 1, g2Cw: 38, ec: 22 },
  };
  const isFunc = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const markRect = (r0: number, c0: number, r1: number, c1: number) => {
    for (let r = Math.max(0, r0); r <= Math.min(size - 1, r1); r += 1) {
      for (let c = Math.max(0, c0); c <= Math.min(size - 1, c1); c += 1) {
        isFunc[r][c] = true;
      }
    }
  };
  markRect(0, 0, 8, 8);
  markRect(0, size - 8, 8, size - 1);
  markRect(size - 8, 0, size - 1, 8);
  for (let i = 0; i < size; i += 1) {
    isFunc[6][i] = true;
    isFunc[i][6] = true;
  }
  const centers = alignTable[version];
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = 0; j < centers.length; j += 1) {
      if ((i === 0 && j === 0) || (i === 0 && j === centers.length - 1) || (i === centers.length - 1 && j === 0)) continue;
      markRect(centers[i] - 2, centers[j] - 2, centers[i] + 2, centers[j] + 2);
    }
  }
  if (version >= 7) {
    markRect(0, size - 11, 5, size - 9);
    markRect(size - 11, 0, size - 9, 5);
  }

  const maskFn = (r: number, c: number) => {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return false;
    }
  };

  const bits: number[] = [];
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = right - dx;
        if (isFunc[r][c]) continue;
        const dark = maskFn(r, c) ? !modules[r][c] : modules[r][c];
        bits.push(dark ? 1 : 0);
      }
    }
    upward = !upward;
  }

  const bt = blockTable[version];
  const totalDataCw = bt.g1 * bt.g1Cw + bt.g2 * bt.g2Cw;
  const cw = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < cw.length; i += 1) {
    let v = 0;
    for (let b = 0; b < 8; b += 1) v = (v << 1) | bits[i * 8 + b];
    cw[i] = v;
  }

  // De-interleave data blocks
  const blockLengths = [
    ...Array<number>(bt.g1).fill(bt.g1Cw),
    ...Array<number>(bt.g2).fill(bt.g2Cw),
  ];
  const blocks = blockLengths.map((len) => new Uint8Array(len));
  let idx = 0;
  const maxLen = Math.max(bt.g1Cw, bt.g2Cw);
  for (let col = 0; col < maxLen; col += 1) {
    for (let b = 0; b < blocks.length; b += 1) {
      if (col < blockLengths[b]) blocks[b][col] = cw[idx++];
    }
  }
  assert.equal(idx, totalDataCw);

  const flatData = new Uint8Array(totalDataCw);
  let pos = 0;
  for (const blk of blocks) {
    flatData.set(blk, pos);
    pos += blk.length;
  }

  const dataBits: number[] = [];
  for (const byte of flatData) {
    for (let b = 7; b >= 0; b -= 1) dataBits.push((byte >>> b) & 1);
  }
  const readBits = (offset: number, count: number) => {
    let v = 0;
    for (let i = 0; i < count; i += 1) v = (v << 1) | dataBits[offset + i];
    return v;
  };
  const mode = readBits(0, 4);
  assert.equal(mode, 0b0100, "Byte mode indicator must be 0100");
  const lenBits = version <= 9 ? 8 : 16;
  const byteLen = readBits(4, lenBits);
  const outBytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i += 1) {
    outBytes[i] = readBits(4 + lenBits + i * 8, 8);
  }

  return { mask, ecLevelBits, payload: new TextDecoder().decode(outBytes) };
}

test("IBAN & BIC validation", () => {
  assert.equal(validateIban("DE89 3704 0044 0532 0130 00"), true);
  assert.equal(normalizeIban("de89 3704 0044 0532 0130 00"), "DE89370400440532013000");
  assert.equal(validateIban("DE00370400440532013000"), false);
  assert.equal(validateIban("INVALID"), false);
  assert.equal(normalizeBic("cobadeffxxx"), "COBADEFFXXX");
  assert.equal(normalizeBic("bad"), "");
});

test("buildEpcQrPayload builds spec-compliant EPC069-12 v002 payloads", () => {
  const payload = buildEpcQrPayload({
    beneficiaryName: "Förderverein Bildung & Kultur e.V.",
    iban: "DE89 3704 0044 0532 0130 00",
    bic: "COBADEFFXXX",
    amountCents: 14950,
    purposeCode: "CHAR",
    remittanceText: "Rechnung R-2026-0042",
  });
  assert.ok(payload);
  const lines = payload.split("\n");
  assert.deepEqual(lines, [
    "BCD",
    "002",
    "1",
    "SCT",
    "COBADEFFXXX",
    "Förderverein Bildung & Kultur e.V.",
    "DE89370400440532013000",
    "EUR149.50",
    "CHAR",
    "",
    "Rechnung R-2026-0042",
  ]);
  assert.ok(new TextEncoder().encode(payload).length <= EPC_QR_MAX_BYTES);

  // Open-amount donation notice omits EUR line cleanly
  const openAmount = buildEpcQrPayload({
    beneficiaryName: "Verein e.V.",
    iban: "DE89370400440532013000",
    purposeCode: "CHAR",
    remittanceText: "Spende",
  });
  assert.ok(openAmount);
  assert.equal(openAmount.split("\n")[7], "");

  // Invalid IBAN or invalid amount returns null
  assert.equal(buildEpcQrPayload({ beneficiaryName: "Verein e.V.", iban: "DE00123456" }), null);
  assert.equal(buildEpcQrPayload({ beneficiaryName: "Verein e.V.", iban: "DE89370400440532013000", amountCents: -100 }), null);
});

test("encodeQrMatrix round-trips ISO/IEC 18004 EC-M across short, medium, and max-331-byte payloads", () => {
  const samples = [
    "BCD\n002\n1\nSCT\n\nVerein\nDE89370400440532013000",
    buildEpcQrPayload({
      beneficiaryName: "Kultur- und Bildungsverein München e.V.",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      amountCents: 25000,
      purposeCode: "CHAR",
      remittanceText: "Spende Jugendförderung 2026 – Herzlichen Dank!",
    })!,
    "X".repeat(331), // Version 13-M exact boundary
  ];

  for (const sample of samples) {
    const matrix = encodeQrMatrix(sample);
    const decoded = verifyAndDecodeQrMatrix(matrix);
    assert.equal(decoded.payload, sample);
    const svg = qrMatrixToSvgPath(matrix, 4);
    assert.equal(svg.viewBoxSize, matrix.size + 8);
    assert.ok(svg.path.startsWith("M4 4"));
  }
});

test("buildEpcQrPayload truncates overly long remittance text cleanly to <= 331 UTF-8 bytes", () => {
  const longText = "Ü".repeat(140); // 280 UTF-8 bytes
  const payload = buildEpcQrPayload({
    beneficiaryName: "Österreichischer & Deutscher Kultur- und Förderverein e.V.",
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
    amountCents: 12345,
    purposeCode: "CHAR",
    remittanceText: longText,
    information: "Zusätzliche Information ".repeat(3),
  });
  assert.ok(payload);
  assert.ok(new TextEncoder().encode(payload).length <= EPC_QR_MAX_BYTES);
  const matrix = encodeQrMatrix(payload);
  const decoded = verifyAndDecodeQrMatrix(matrix);
  assert.equal(decoded.payload, payload);
});
