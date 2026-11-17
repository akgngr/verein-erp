/**
 * ELSTER-2: Steuernummer conversion from the state format printed on tax notices ("Standardschema der Länder")
 * to the 13-digit nationwide ELSTER format (FFFF0BBBUUUUP). Pure; no checksum validation (the Finanzamt
 * check digit P is kept as given). Ambiguous slash formats (BE/HH/NI/RP) need the federal state.
 */
export const FEDERAL_STATES = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"] as const;
export type FederalState = (typeof FEDERAL_STATES)[number];

/** State format (digits only, in order) → ELSTER prefix and layout. F = Finanzamt, B = district, U = number, P = check digit. */
const RULES: Record<FederalState, { pattern: RegExp; build: (m: RegExpExecArray) => string }> = {
  BW: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `28${m[1]}0${m[2]}${m[3]}` },
  BY: { pattern: /^(\d{3})(\d{3})(\d{5})$/, build: (m) => `9${m[1]}0${m[2]}${m[3]}` },
  BE: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `11${m[1]}0${m[2]}${m[3]}` },
  BB: { pattern: /^0(\d{2})(\d{3})(\d{5})$/, build: (m) => `30${m[1]}0${m[2]}${m[3]}` },
  HB: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `24${m[1]}0${m[2]}${m[3]}` },
  HH: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `22${m[1]}0${m[2]}${m[3]}` },
  HE: { pattern: /^0(\d{2})(\d{3})(\d{5})$/, build: (m) => `26${m[1]}0${m[2]}${m[3]}` },
  MV: { pattern: /^0(\d{2})(\d{3})(\d{5})$/, build: (m) => `40${m[1]}0${m[2]}${m[3]}` },
  NI: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `23${m[1]}0${m[2]}${m[3]}` },
  NW: { pattern: /^(\d{3})(\d{4})(\d{4})$/, build: (m) => `5${m[1]}0${m[2]}${m[3]}` },
  RP: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `27${m[1]}0${m[2]}${m[3]}` },
  SL: { pattern: /^0(\d{2})(\d{3})(\d{5})$/, build: (m) => `10${m[1]}0${m[2]}${m[3]}` },
  SN: { pattern: /^2(\d{2})(\d{3})(\d{5})$/, build: (m) => `32${m[1]}0${m[2]}${m[3]}` },
  ST: { pattern: /^1(\d{2})(\d{3})(\d{5})$/, build: (m) => `31${m[1]}0${m[2]}${m[3]}` },
  SH: { pattern: /^(\d{2})(\d{3})(\d{5})$/, build: (m) => `21${m[1]}0${m[2]}${m[3]}` },
  TH: { pattern: /^1(\d{2})(\d{3})(\d{5})$/, build: (m) => `41${m[1]}0${m[2]}${m[3]}` },
};

/**
 * Returns the 13-digit ELSTER Steuernummer, or null when the input does not match the state's format.
 * A number that is already 13 digits is returned unchanged.
 */
export function toElsterTaxNumber(taxNumber: string, state: FederalState): string | null {
  const digits = taxNumber.replace(/\D/g, "");
  if (digits.length === 13) return digits;
  const rule = RULES[state];
  const match = rule.pattern.exec(digits);
  return match ? rule.build(match) : null;
}
