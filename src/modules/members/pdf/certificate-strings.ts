import type { MembershipType, MemberStatus } from "@prisma/client";

/** TR/DE texts of the membership certificate and card (kept apart from the PDF renderer). */
export const CERTIFICATE_STRINGS = {
  de: {
    title: "Mitgliedsbescheinigung",
    subtitle: "Amtliche Bestätigung der Vereinsmitgliedschaft",
    introActive:
      "Hiermit wird bestätigt, dass die unten genannte Person Mitglied unseres Vereins ist.",
    introInactive:
      "Hiermit wird die Mitgliedschaft der unten genannten Person in unserem Verein gemäß den gespeicherten Vereinsdaten bescheinigt.",
    memberName: "Name",
    membershipNumber: "Mitgliedsnummer",
    typeLabel: "Mitgliedsart",
    statusLabel: "Status",
    joinDate: "Eintrittsdatum",
    exitDate: "Austrittsdatum",
    address: "Anschrift",
    issuedAt: "Ausgestellt am",
    cardTitle: "Mitgliedsausweis",
    cardMemberSince: "Mitglied seit",
    signatureHint: "Dieses Dokument wurde elektronisch erstellt und ist ohne Unterschrift gültig.",
    // The membership class is stated only here, from the member's actual type.
    types: {
      ASIL: "Ordentliches Mitglied",
      ONURSAL: "Ehrenmitglied",
      FAHRI: "Ehrenamtliches Mitglied",
      DESTEKCI: "Fördermitglied",
    } satisfies Record<MembershipType, string>,
    statuses: {
      ACTIVE: "Aktiv",
      PASSIVE: "Passiv",
      RESIGNED: "Ausgetreten",
      DECEASED: "Verstorben",
    } as Record<MemberStatus, string>,
  },
  tr: {
    title: "Üyelik Belgesi",
    subtitle: "Resmî Dernek Üyelik Onayı",
    introActive:
      "Aşağıda bilgileri yer alan kişinin derneğimizin kayıtlı üyesi olduğu onaylanır.",
    introInactive:
      "Aşağıda bilgileri yer alan kişinin derneğimizdeki üyelik kaydına ilişkin durum bilgileri aşağıda sunulmuştur.",
    memberName: "Ad Soyad",
    membershipNumber: "Üye Numarası",
    typeLabel: "Üyelik Türü",
    statusLabel: "Durum",
    joinDate: "Katılım Tarihi",
    exitDate: "Ayrılış Tarihi",
    address: "Adres",
    issuedAt: "Düzenlenme Tarihi",
    cardTitle: "Üye Kartı",
    cardMemberSince: "Üyelik Başlangıcı",
    signatureHint: "Bu belge elektronik ortamda düzenlenmiştir; imza gerektirmez.",
    types: {
      ASIL: "Asıl Üye",
      ONURSAL: "Onursal Üye",
      FAHRI: "Fahri Üye",
      DESTEKCI: "Destekçi Üye",
    } satisfies Record<MembershipType, string>,
    statuses: {
      ACTIVE: "Aktif",
      PASSIVE: "Pasif",
      RESIGNED: "Ayrıldı",
      DECEASED: "Vefat",
    } as Record<MemberStatus, string>,
  },
} as const;
