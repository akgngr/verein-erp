/**
 * Faz 5 (§ 7) zorunlu doğrulama: amountToGermanWords'ün spec'teki tüm örnekleri.
 * Tek seferlik; depoda kalıcı. Çalıştırma: bun scripts/verify-amount-words.ts
 */
import { amountToGermanWords } from "../src/shared/german-number-words";

const CASES: Array<[number, string]> = [
  [100, "ein Euro"],
  [2500, "fünfundzwanzig Euro"],
  [10000, "einhundert Euro"],
  [10101, "einhunderteins Euro und ein Cent"],
  [123450, "eintausendzweihundertvierunddreißig Euro und fünfzig Cent"],
  [200000, "zweitausend Euro"],
  [1234567, "zwölftausenddreihundertfünfundvierzig Euro und siebenundsechzig Cent"],
  [2121, "einundzwanzig Euro und einundzwanzig Cent"],
  [5000, "fünfzig Euro"],
  [5, "null Euro und fünf Cent"],
  [100000000, "eine Million Euro"],
  [250000000, "zwei Millionen fünfhunderttausend Euro"],
  // Ek sınır durumları (sağlamlık):
  [0, "null Euro"],
  [100, "ein Euro"], // (1 yeniden — bağımsız doğrulama)
  [1, "null Euro und ein Cent"],
  [10100, "einhunderteins Euro"],
  [16, "null Euro und sechzehn Cent"],
  [17, "null Euro und siebzehn Cent"],
  [1110, "elf Euro und zehn Cent"],
  [7654321, "sechsundsiebzigtausendfünfhundertdreiundvierzig Euro und einundzwanzig Cent"], // 76.543,21 €
  [999999999, "neun Millionen neunhundertneunundneunzigtausendneunhundertneunundneunzig Euro und neunundneunzig Cent"],
];

let failed = 0;
for (const [cents, expected] of CASES) {
  const actual = amountToGermanWords(cents);
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL ${cents}: "${actual}" ≠ beklenen "${expected}"`);
  } else {
    console.log(`ok   ${cents} → ${actual}`);
  }
}

if (failed > 0) {
  console.error(`${failed} durum BAŞARISIZ`);
  process.exit(1);
}
console.log(`Tüm ${CASES.length} durum geçti.`);
