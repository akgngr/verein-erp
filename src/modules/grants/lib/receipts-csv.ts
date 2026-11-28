import { neutralizeCsvFormula } from "@/shared/files/csv-formula";

/**
 * One `belegliste.csv` cell: free text (description, counterparty, budget line) is neutralized
 * against spreadsheet formulas (`=`, `+`, `-`, `@`), then quoted.
 */
export const csvCell = (value: string | number | null | undefined): string => {
  const s = value === null || value === undefined ? "" : neutralizeCsvFormula(String(value));
  return `"${s.replace(/"/g, '""')}"`;
};

/** Upper bound for the receipts held in memory while one ZIP is built (files are read only below it). */
export const RECEIPTS_ZIP_MAX_BYTES = 200 * 1024 * 1024;
