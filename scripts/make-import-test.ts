/**
 * İçe aktarma E2E test dosyası üretici: /tmp/import-test.xlsx
 * 2 geçerli üye + 1 hatalı satır (bilinmeyen tür).
 * Çalıştırma: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/make-import-test.ts
 */

import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Üyeler");
  sheet.columns = [
    { header: "Ad", key: "firstName", width: 18 },
    { header: "Soyad", key: "lastName", width: 18 },
    { header: "Üyelik Türü", key: "type", width: 16 },
    { header: "Üyelik Başlangıç Tarihi", key: "joinDate", width: 24 },
    { header: "Durum", key: "status", width: 12 },
    { header: "E-posta", key: "email", width: 26 },
    { header: "Şehir", key: "city", width: 16 },
  ];

  sheet.addRow({
    firstName: "Zeynep",
    lastName: "Kaya",
    type: "Destekçi Üye",
    joinDate: new Date(2026, 2, 1),
    status: "Aktif",
    email: "zeynep.kaya@example.com",
    city: "Berlin",
  });
  sheet.addRow({
    firstName: "Ahmet",
    lastName: "Demir",
    type: "Asıl Üye",
    joinDate: "10.01.2026",
    status: "Aktif",
    email: "ahmet.demir@example.com",
    city: "Köln",
  });
  sheet.addRow({
    firstName: "Hatalı",
    lastName: "Satır",
    type: "Bilinmeyen Tür",
    joinDate: "01.02.2026",
    status: "Aktif",
    email: "hatali@example.com",
    city: "Hamburg",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  writeFileSync("/tmp/import-test.xlsx", Buffer.from(buffer as ArrayBuffer));
  console.log("/tmp/import-test.xlsx yazıldı (3 satır: 2 geçerli + 1 hatalı)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
