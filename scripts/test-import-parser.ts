/**
 * Import-parser birim testi (Faz 3 eklemeleri) — DB'siz, saf dosya→satır.
 * Çalıştırma: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/test-import-parser.ts
 * (server-only işaretçisi react-server koşulunda boş moda çözümlenir.)
 */

import ExcelJS from "exceljs";

import { parseImportWorkbook } from "../src/modules/members/services/import-parser";

async function buildWorkbook(rows: Array<Array<string | Date>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Üyeler");
  // KARAR: addRow(object) yalnız sheet.columns tanımlıysa kolon eşler —
  // testte dizi kullanılır (gerçek şablonlar da dizi satırları üretir).
  sheet.addRow(["Ad", "Soyad", "Üyelik Türü", "Üyelik Başlangıç Tarihi", "Durum", "E-posta", "Doğum Tarihi"]);
  for (const row of rows) sheet.addRow(row);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

async function main() {
  // 1) Geçerli satır + TR uzun tür adı + gerçek tarih hücresi
  // 2) Bilinmeyen tür → satır hatası
  // 3) Geçersiz tarih metni → satır hatası
  const buffer = await buildWorkbook([
    ["Ayşe", "Yılmaz", "Asıl Üye", new Date(2026, 0, 15), "Aktif", "AYSE@Example.com", "20.06.1985"],
    ["Ali", "Deneme", "Bilinmeyen Tür", "15.03.2026", "Pasif", "ali@example.com", null],
    ["Mehmet", "Tarih", "Fahri Üye", "15/03/2026", "Ayrıldı", "mehmet@example.com", null],
  ]);

  const result = await parseImportWorkbook(buffer);

  console.log("total:", result.total);
  console.log("valid:", result.rows.length);
  console.log("errors:", result.errors.length);

  if (result.total !== 3) throw new Error("BEKLENİYORDU total=3");
  if (result.rows.length !== 1) throw new Error("BEKLENİYORDU valid=1");
  if (result.errors.length !== 2) throw new Error("BEKLENİYORDU errors=2");

  const valid = result.rows[0]!;
  if (valid.data.type !== "ASIL") throw new Error("tür eşlenmedi: " + valid.data.type);
  if (valid.data.status !== "ACTIVE") throw new Error("durum eşlenmedi");
  if (valid.data.email !== "ayse@example.com") throw new Error("e-posta küçük harfe inmedi");
  if (valid.data.joinDate !== "2026-01-15") throw new Error("tarih hücresi okunmadı");
  if (valid.data.birthDate !== "1985-06-20") throw new Error("gg.aa.yyyy metni okunmadı");

  const unknownRow = result.errors.find((e) => e.row === 3);
  const badDateRow = result.errors.find((e) => e.row === 4);
  if (!unknownRow || !unknownRow.messages.some((m) => m.includes("Bilinmeyen üyelik türü"))) {
    throw new Error("bilinmeyen tür hatası yok");
  }
  if (!badDateRow || !badDateRow.messages.some((m) => m.includes("başlangıç tarihi"))) {
    throw new Error("geçersiz tarih hatası yok: " + JSON.stringify(badDateRow));
  }

  console.log("IMPORT-PARSER TESTİ: TAMAM ✓");
}

main().catch((error) => {
  console.error("TEST BAŞARISIZ:", error);
  process.exit(1);
});
