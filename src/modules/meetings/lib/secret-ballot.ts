import { createHash, randomBytes, randomInt } from "node:crypto";

/**
 * Secret ballot primitives (RFC-004 §2, §9; #522). Pure functions only — no database, no I/O.
 * Unlinkability comes from what is NOT stored: ballots never carry a member id, time, order, session or IP.
 */

/** Crockford base32 (no I, L, O, U): easy to read from paper and to type at a kiosk. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/** One-time ballot code: 130 bits of randomness, shown once (printed / kiosk). Format XXXXX-XXXXX-… (26 chars). */
export function newBallotCode(): string {
  return base32(randomBytes(17)).slice(0, 26).replace(/(.{5})(?=.)/g, "$1-");
}

/** Accepts lower case, spaces and the usual look-alikes (O→0, I/L→1). */
export function normalizeBallotCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]+/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

export const isBallotCodeShape = (normalized: string) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(normalized);

/** Only the hash is stored. 130-bit codes make a plain SHA-256 safe against guessing. */
export function hashBallotCode(code: string): string {
  return createHash("sha256").update(`meetings-vote:${normalizeBallotCode(code)}`).digest("hex");
}

/** Random ballot id (128 bit). Not cuid: cuids embed a timestamp. */
export const newBallotId = () => randomBytes(16).toString("hex");

/** Receipt code shown to the voter after casting (§9.2). It never reveals the choice. 80 bits, 16 chars. */
export const newReceiptCode = () => base32(randomBytes(10)).replace(/(.{4})(?=.)/g, "$1-");

/** Minute precision for `usedAt` (§2.2); nulled at close anyway. */
export function minutePrecision(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 60_000) * 60_000);
}

export const DEFAULT_MIN_BALLOTS = 5;
export const LOWEST_MIN_BALLOTS = 3;
export const RETENTION_MONTHS = 12;
export const YES_NO_ABSTAIN = ["yes", "no", "abstain"] as const;

/** `minBallots` below the default needs a reason (recorded in the minutes); never below 3 (§9.3). */
export function validateMinBallots(value: number, reason: string | null): "ok" | "tooLow" | "reasonRequired" {
  if (!Number.isInteger(value) || value < LOWEST_MIN_BALLOTS) return "tooLow";
  if (value < DEFAULT_MIN_BALLOTS && !reason?.trim()) return "reasonRequired";
  return "ok";
}

export type BallotRow = { choice: string; weight: number; ballotNonce: string };

/** Weighted totals per option (every option present, also with 0). */
export function tally(options: readonly string[], ballots: readonly BallotRow[]): Record<string, number> {
  const totals = Object.fromEntries(options.map((option) => [option, 0])) as Record<string, number>;
  for (const ballot of ballots) if (ballot.choice in totals) totals[ballot.choice] += ballot.weight;
  return totals;
}

/**
 * SHA-256 over the canonically sorted ballot list ("choice,weight,nonce" lines). Written into the minutes so a
 * recount during the challenge period can prove the list was not changed. Sorting removes any insertion order.
 */
export function ballotListHash(ballots: readonly BallotRow[]): string {
  const lines = ballots.map((ballot) => `${ballot.choice},${ballot.weight},${ballot.ballotNonce}`).sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

/** Fisher–Yates with a CSPRNG: published receipt list order carries no information. */
export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** Result for a yes/no/abstain vote; null for candidate lists (the chair records those decisions by hand). */
export function yesNoResult(options: readonly string[], totals: Record<string, number>): "ACCEPTED" | "REJECTED" | null {
  if (options.length !== 3 || !YES_NO_ABSTAIN.every((option, index) => options[index] === option)) return null;
  return totals.yes > totals.no ? "ACCEPTED" : "REJECTED";
}
