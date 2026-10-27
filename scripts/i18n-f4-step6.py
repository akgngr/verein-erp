#!/usr/bin/env python3
"""Faz 4 Adım 6 i18n güncellemeleri: documents.delivery etiketleri (KEP→REGISTERED_MAIL+FAX),
meetings form/detail davet alanları, members ülke + fesih bildirimi + ödemeler + veri dışa aktarma."""
import json, io

def load(path):
    with io.open(path, encoding="utf-8") as f:
        return json.load(f)

def save(path, data):
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def deep_set(d, path_list, value):
    cur = d
    for key in path_list[:-1]:
        cur = cur.setdefault(key, {})
    cur[path_list[-1]] = value

TR = "/home/z/my-project/messages/tr.json"
DE = "/home/z/my-project/messages/de.json"

tr = load(TR)
de = load(DE)

# --- documents.delivery (4.4) ---
delivery_tr = {
    "POST": "Posta (Post)",
    "EMAIL": "E-posta",
    "HAND": "Elden (persönlich)",
    "COURIER": "Kargo/Kurye",
    "REGISTERED_MAIL": "Taahhütlü posta (Einschreiben)",
    "FAX": "Faks",
    "OTHER": "Diğer",
}
delivery_de = {
    "POST": "Post",
    "EMAIL": "E-Mail",
    "HAND": "Persönlich",
    "COURIER": "Kurier",
    "REGISTERED_MAIL": "Einschreiben",
    "FAX": "Fax",
    "OTHER": "Sonstige",
}
for msgs, dl in ((tr, delivery_tr), (de, delivery_de)):
    msgs["documents"]["delivery"] = dl

# --- meetings: davet gönderim tarihi (4.5) ---
meet_tr = {
    "form": {
        "invitationSentAt": "Davet gönderim tarihi (Einladung versandt am)",
        "invitationSentAtDescription": "Davetin üyelere gönderildiği tarih; toplantı tarihinden sonra olamaz.",
    },
    "detail": {
        "fieldInvitationSentAt": "Davet gönderim tarihi (Einladung versandt am)",
        "invitationLeadTime": "Davet süresi: {count} gün",
    },
    "pdf": {
        "invitationSentAt": "Einladung versandt am",
    },
}
meet_de = {
    "form": {
        "invitationSentAt": "Einladung versandt am",
        "invitationSentAtDescription": "Datum des Versands der Einladung; darf nicht nach dem Sitzungsdatum liegen.",
    },
    "detail": {
        "fieldInvitationSentAt": "Einladung versandt am",
        "invitationLeadTime": "Einladungsfrist: {count} Tage",
    },
    "pdf": {
        "invitationSentAt": "Einladung versandt am",
    },
}
for msgs, mm in ((tr, meet_tr), (de, meet_de)):
    m = msgs["meetings"]
    for ns, values in mm.items():
        m.setdefault(ns, {}).update(values)

# --- members: ülke, fesih bildirimi, ödemeler, veri dışa aktarma (4.6) ---
mem_tr = {
    "form": {
        "country": "Ülke (Land)",
        "countryDescription": "Boş bırakılırsa veya Almanya ise posta kodu 5 haneli girilmelidir.",
        "cancellationReceivedAt": "Fesih bildirimi tarihi (Kündigung eingegangen am)",
        "cancellationReceivedAtDescription": "Kullanıcının istifa bildiriminin derneğe ulaştığı tarih; ayrılış tarihinden sonra olamaz.",
    },
    "detail": {
        "fieldCountry": "Ülke (Land)",
        "fieldCancellationReceivedAt": "Fesih bildirimi tarihi (Kündigung eingegangen am)",
    },
    "statusMenu": {
        "cancellationReceivedAtLabel": "Fesih bildirimi tarihi (Kündigung eingegangen am)",
        "cancellationReceivedAtHint": "Opsiyoneldir; ayrılış tarihinden sonra olamaz.",
    },
    "payments": {
        "title": "Aidat Ödemeleri (Mitgliedsbeiträge)",
        "empty": "Bu üye için ödeme kaydı yok.",
        "add": "Ödeme ekle",
        "colReceipt": "Makbuz No",
        "colDueYear": "Aidat yılı",
        "colAmount": "Tutar",
        "colMethod": "Yöntem",
        "colPaidAt": "Ödeme tarihi",
        "colStatus": "Durum",
        "statusActive": "Aktif",
        "statusVoided": "İptal edildi",
        "receiptPdf": "Makbuz PDF",
        "void": "İptal et",
        "voidTitle": "Ödemeyi iptal et (Storno)",
        "voidReason": "İptal nedeni (5-300 karakter)",
        "voidConfirm": "İptal etmek zorunludur ve geri alınamaz; muhasebe aktarımı yapıldıysa fişin ters kaydı sonraki aktarımda oluşturulur.",
        "method": {
            "CASH": "Nakit (Bar)",
            "BANK_TRANSFER": "Banka havalesi (Überweisung)",
            "CARD": "Kart (Kartenzahlung)",
            "OTHER": "Diğer (Sonstige)",
        },
        "form": {
            "title": "Yeni aidat ödemesi (Mitgliedsbeitrag)",
            "dueYear": "Aidat yılı (Beitrag für das Jahr)",
            "amount": "Tutar (€)",
            "method": "Ödeme yöntemi",
            "paidAt": "Ödeme tarihi",
            "reference": "Referans / açıklama",
            "referenceDescription": "Örn. banka dekont numarası (en fazla 100 karakter).",
            "save": "Kaydet",
            "cancel": "Vazgeç",
        },
        "voidedInfo": "İptal: {date} — {reason}",
        "toastSaved": "Ödeme kaydedildi: {receipt}",
        "toastVoided": "Ödeme iptal edildi.",
    },
    "dataExport": {
        "action": "Veri dışa aktar (DSGVO Art. 15)",
        "description": "Üyenin tüm kayıtlı verileri JSON dosyası olarak indirilir.",
        "toastStarted": "Veri dosyası indiriliyor.",
    },
}
mem_de = {
    "form": {
        "country": "Land",
        "countryDescription": "Leer oder Deutschland: Postleitzahl muss 5-stellig sein.",
        "cancellationReceivedAt": "Kündigung eingegangen am",
        "cancellationReceivedAtDescription": "Datum des Eingangs der Kündigung; darf nicht nach dem Austrittsdatum liegen.",
    },
    "detail": {
        "fieldCountry": "Land",
        "fieldCancellationReceivedAt": "Kündigung eingegangen am",
    },
    "statusMenu": {
        "cancellationReceivedAtLabel": "Kündigung eingegangen am",
        "cancellationReceivedAtHint": "Optional; darf nicht nach dem Austrittsdatum liegen.",
    },
    "payments": {
        "title": "Mitgliedsbeiträge",
        "empty": "Keine Zahlungen für dieses Mitglied.",
        "add": "Zahlung erfassen",
        "colReceipt": "Quittungs-Nr.",
        "colDueYear": "Beitragsjahr",
        "colAmount": "Betrag",
        "colMethod": "Zahlungsart",
        "colPaidAt": "Zahlungsdatum",
        "colStatus": "Status",
        "statusActive": "Aktiv",
        "statusVoided": "Storniert",
        "receiptPdf": "Quittung PDF",
        "void": "Stornieren",
        "voidTitle": "Zahlung stornieren",
        "voidReason": "Grund (5-300 Zeichen)",
        "voidConfirm": "Ein Grund ist erforderlich; der Vorgang kann nicht rückgängig gemacht werden. Der Gegenbuchung erfolgt beim nächsten Abgleich.",
        "method": {
            "CASH": "Bar",
            "BANK_TRANSFER": "Überweisung",
            "CARD": "Kartenzahlung",
            "OTHER": "Sonstige",
        },
        "form": {
            "title": "Neuer Mitgliedsbeitrag",
            "dueYear": "Beitragsjahr",
            "amount": "Betrag (€)",
            "method": "Zahlungsart",
            "paidAt": "Zahlungsdatum",
            "reference": "Referenz / Notiz",
            "referenceDescription": "z. B. Nummer des Kontoauszugs (max. 100 Zeichen).",
            "save": "Speichern",
            "cancel": "Abbrechen",
        },
        "voidedInfo": "Storniert: {date} — {reason}",
        "toastSaved": "Zahlung erfasst: {receipt}",
        "toastVoided": "Zahlung storniert.",
    },
    "dataExport": {
        "action": "Datenexport (DSGVO Art. 15)",
        "description": "Alle gespeicherten Daten des Mitglieds werden als JSON-Datei heruntergeladen.",
        "toastStarted": "Datendatei wird heruntergeladen.",
    },
}
for msgs, mem in ((tr, mem_tr), (de, mem_de)):
    m = msgs["members"]
    for ns, values in mem.items():
        if ns in ("form", "detail", "statusMenu"):
            m.setdefault(ns, {}).update(values)
        else:
            m[ns] = values

save(TR, tr)
save(DE, de)
print("OK: documents.delivery, meetings davet alanları, members ülke/ödeme/veri-aktarma mesajları güncellendi")
