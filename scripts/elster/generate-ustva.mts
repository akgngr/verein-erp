/**
 * Writes synthetic UStVA payloads (validation only, Testmerker) for the ERiC check.
 * Uses the ELSTER test tax office 9198 ("Testfinanzamt"); no real organisation data.
 * Usage: pnpm elster:corpus <out-dir>
 */
import fs from "node:fs";
import path from "node:path";

const { buildElsterUstvaXml, elsterPeriod } = await import("../../src/modules/accounting/services/elster-ustva.ts");

const out = path.resolve(process.argv[2] ?? "elster-out");
fs.mkdirSync(out, { recursive: true });
const year = Number(process.env.ELSTER_YEAR ?? new Date().getUTCFullYear());
const base = {
  year,
  taxNumber: "9198011310010",
  supplier: { name: "Musterverein Beispielstadt e.V.", street: "Vereinsweg 1", postalCode: "10115", city: "Berlin", email: "kasse@musterverein.example" },
  producer: { id: process.env.ELSTER_PRODUCER_ID ?? "74931", name: "Verein ERP", version: "conformance" },
  createdAt: new Date(),
};
const cases = {
  "month-refund": { period: elsterPeriod("MONTH", 1), ustva: { kz81BaseEuros: 0, kz86BaseEuros: 0, kz66Cents: 12_345, kz83Cents: -12_345 } },
  "quarter-payment": { period: elsterPeriod("QUARTER", 1), ustva: { kz81BaseEuros: 10_000, kz86BaseEuros: 2_000, kz66Cents: 45_600, kz83Cents: 190_000 + 14_000 - 45_600 } },
  "month-zero": { period: elsterPeriod("MONTH", 2), ustva: { kz81BaseEuros: 0, kz86BaseEuros: 0, kz66Cents: 0, kz83Cents: 0 } },
};
for (const [name, data] of Object.entries(cases)) {
  fs.writeFileSync(path.join(out, `ustva-${name}.xml`), buildElsterUstvaXml({ ...base, ...data }));
}
console.log(`[elster] ${Object.keys(cases).length} UStVA cases (year ${year}) → ${out}`);
