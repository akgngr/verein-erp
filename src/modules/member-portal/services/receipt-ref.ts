import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type ReceiptKind = "dues" | "donation";

type ReceiptRefPayload = {
  k: ReceiptKind;
  i: string;
  s: string;
  e: number;
};

/**
 * #580: Sabit yedek sır kaldırıldı (fail closed). Önceden hiçbir sır yokken bilinen bir değerle imzalıyordu;
 * makbuz bağlantıları taklit edilebilirdi. PORTAL_RECEIPT_SECRET (yoksa AUTH_SECRET) en az 16 karakter olmalı.
 */
function getSigningSecret(): string {
  const secret = process.env.PORTAL_RECEIPT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (secret.length < 16) throw new Error("PORTAL_RECEIPT_SECRET_MISSING");
  return secret;
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getSigningSecret()).update(payloadB64).digest("base64url");
}

/**
 * Generates an opaque, short-lived, subject-bound signed reference for receipt downloads
 * so database IDs are never exposed to the browser (ADR 0010 P2, IDOR-safe).
 */
export function signReceiptRef(input: {
  kind: ReceiptKind;
  id: string;
  subjectRef: string;
  ttlSeconds?: number;
  nowMs?: number;
}): string {
  const now = input.nowMs ?? Date.now();
  const ttl = input.ttlSeconds ?? 900;
  const payload: ReceiptRefPayload = {
    k: input.kind,
    i: input.id,
    s: input.subjectRef,
    e: Math.floor(now / 1000) + ttl,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyReceiptRef(
  ref: string,
  expectedSubjectRef: string,
  nowMs?: number,
): { kind: ReceiptKind; id: string } | null {
  const parts = ref.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expectedSig = signPayload(payloadB64);
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let parsed: ReceiptRefPayload;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as ReceiptRefPayload;
  } catch {
    return null;
  }

  if (
    !parsed ||
    (parsed.k !== "dues" && parsed.k !== "donation") ||
    typeof parsed.i !== "string" ||
    typeof parsed.s !== "string" ||
    typeof parsed.e !== "number"
  ) {
    return null;
  }

  const nowSec = Math.floor((nowMs ?? Date.now()) / 1000);
  if (parsed.e <= nowSec) return null;
  if (parsed.s !== expectedSubjectRef) return null;

  return { kind: parsed.k, id: parsed.i };
}
