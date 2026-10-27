import "server-only";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { can } from "@/shared/permissions/define";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { MEMBERSHIP_TYPE_LABELS } from "../constants";
import { membersPermissions } from "../permissions";

/**
 * İçe aktarma şablonu (GET /api/members/import-template, Faz 3 eklemeleri).
 * "Üyeler" sayfası: başlıklar + örnek satır. "Açıklamalar" sayfası: sütun
 * listesi, zorunluluklar, geçerli üyelik türü adları, tarih biçimi.
 * KARAR: Şablon indirme audit'lenmez (veri taşımaz, üretim işlemi değildir).
 */
export async function importTemplateHandler(): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, membersPermissions, "create")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet("Üyeler");
  sheet.columns = [
    { header: "Ad", key: "firstName", width: 18 },
    { header: "Soyad", key: "lastName", width: 18 },
    { header: "Üyelik Türü", key: "type", width: 16 },
    { header: "Üyelik Başlangıç Tarihi", key: "joinDate", width: 24 },
    { header: "Durum", key: "status", width: 12 },
    { header: "E-posta", key: "email", width: 26 },
    { header: "Telefon", key: "phone", width: 18 },
    { header: "Straße", key: "street", width: 22 },
    { header: "Kapı No", key: "houseNumber", width: 10 },
    { header: "PLZ", key: "postalCode", width: 8 },
    { header: "Şehir", key: "city", width: 16 },
    { header: "Eyalet", key: "state", width: 14 },
    { header: "Ülke", key: "country", width: 14 },
    { header: "Doğum Tarihi", key: "birthDate", width: 14 },
    { header: "Notlar", key: "notes", width: 30 },
  ];

  const example = sheet.addRow({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    type: "Asıl Üye",
    joinDate: new Date("2026-01-15T00:00:00.000Z"),
    status: "Aktif",
    email: "ayse@example.com",
    phone: "+49 170 1234567",
    street: "Hauptstraße",
    houseNumber: "12",
    postalCode: "60311",
    city: "Frankfurt am Main",
    state: "Hessen",
    country: "Deutschland",
    birthDate: new Date("1985-06-20T00:00:00.000Z"),
    notes: "Örnek satır — yüklemadan önce silinmez, isterseniz boş bırakın.",
  });
  for (const key of ["joinDate", "birthDate"]) {
    example.getCell(key).numFmt = "dd.mm.yyyy";
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 15 } };

  const info = workbook.addWorksheet("Açıklamalar");
  info.columns = [{ header: "Açıklama", key: "text", width: 110 }];
  const lines = [
    "ÜYE İÇE AKTARMA ŞABLONU",
    "",
    "1. Yalnızca 'Üyeler' sayfası okunur; bu sayfadaki örnek satırı silebilirsiniz.",
    "2. Zorunlu sütunlar: Ad, Soyad, Üyelik Türü, Üyelik Başlangıç Tarihi.",
    "3. Tarih biçimi: gg.aa.yyyy (örn. 15.03.2026) veya gerçek tarih hücresi.",
    "4. Üyelik Türü geçerli değerleri: " + Object.values(MEMBERSHIP_TYPE_LABELS).map((label) => `${label} Üye`).join(", ") + ".",
    "5. Durum geçerli değerleri: Aktif, Pasif, Ayrıldı (boş bırakılırsa Aktif sayılır; 'Vefat' içe aktarılmaz, sistemde elle işaretlenir).",
    "6. Üye numarası otomatik atanır; dosyada numara sütunu bulunmaz.",
    "7. Kimlik numarası, banka hesabı gibi hassas bilgiler bu şablonda YOKTUR ve içe aktarılmaz (KVKK).",
    "8. Mükerrer kayıtlar (aynı e-posta veya aynı ad+soyad+doğum tarihi) satır hatası olarak raporlanır.",
    "9. En fazla 2.000 veri satırı ve 5 MB dosya boyutu kabul edilir.",
    "10. 'Kontrol et' adımı hiçbir kayıt oluşturmaz; hatalı satırlar atlanarak geçerli satırlar içe aktarılır.",
  ];
  for (const line of lines) info.addRow({ text: line });
  info.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="uye-ice-aktarma-sablonu.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
