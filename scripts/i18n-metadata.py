#!/usr/bin/env python3
"""Statik metadata başlıklarını generateMetadata (next-intl) ile çevirir."""
import json
import re
from pathlib import Path

BASE = Path("/home/z/my-project")

# page.tsx → meta anahtarı
MAPPING = {
    "src/app/(dashboard)/evrak/page.tsx": "evrak",
    "src/app/(dashboard)/evrak/yeni/page.tsx": "evrakYeni",
    "src/app/(dashboard)/evrak/[id]/page.tsx": "evrakDetay",
    "src/app/(dashboard)/evrak/[id]/duzenle/page.tsx": "evrakDuzenle",
    "src/app/(dashboard)/evrak/kategoriler/page.tsx": "evrakKategoriler",
    "src/app/(dashboard)/toplantilar/page.tsx": "toplantilar",
    "src/app/(dashboard)/toplantilar/yeni/page.tsx": "toplantiYeni",
    "src/app/(dashboard)/toplantilar/[id]/page.tsx": "toplantiDetay",
    "src/app/(dashboard)/toplantilar/[id]/duzenle/page.tsx": "toplantiDuzenle",
    "src/app/(dashboard)/toplantilar/gorevler/page.tsx": "toplantiGorevler",
    "src/app/(dashboard)/uyeler/page.tsx": "uyeler",
    "src/app/(dashboard)/uyeler/yeni/page.tsx": "uyeYeni",
    "src/app/(dashboard)/uyeler/[id]/page.tsx": "uyeDetay",
    "src/app/(dashboard)/uyeler/[id]/duzenle/page.tsx": "uyeDuzenle",
    "src/app/(dashboard)/ayarlar/kullanicilar/page.tsx": "kullanicilar",
    "src/app/(dashboard)/ayarlar/kullanicilar/yeni/page.tsx": "kullaniciYeni",
    "src/app/(dashboard)/ayarlar/kullanicilar/[id]/page.tsx": "kullaniciDuzenle",
    "src/app/(dashboard)/ayarlar/denetim-kaydi/page.tsx": "denetimKaydi",
    "src/app/(dashboard)/profil/page.tsx": "profil",
}

IMPORT_LINE = 'import { getTranslations } from "next-intl/server";'

changed = []
for rel, key in MAPPING.items():
    path = BASE / rel
    content = path.read_text(encoding="utf-8")
    m = re.search(r'export const metadata = \{ title: "([^"]+)" \};', content)
    if not m:
        print(f"SKIP {rel}")
        continue
    new_meta = (
        "export async function generateMetadata() {\n"
        '  const t = await getTranslations("meta");\n'
        f'  return {{ title: t("{key}") }};\n'
        "}"
    )
    content = content.replace(m.group(0), new_meta)
    # getTranslations import'u yoksa ekle (ilk import satırından önce)
    if IMPORT_LINE not in content:
        # İlk import satırını bul
        first_import = re.search(r'^import .+$', content, re.MULTILINE)
        content = content[:first_import.start()] + IMPORT_LINE + "\n" + content[first_import.start():]
    path.write_text(content, encoding="utf-8")
    changed.append(rel)

print(f"CHANGED {len(changed)}/{len(MAPPING)}")
for rel in changed:
    print(" -", rel)

# messages'a meta namespace ekle
meta_tr = {
    "panel": "Panel", "evrak": "Evrak Kayıt", "evrakYeni": "Yeni Evrak",
    "evrakDetay": "Evrak Detayı", "evrakDuzenle": "Evrağı Düzenle",
    "evrakKategoriler": "Evrak Kategorileri", "toplantilar": "Toplantılar",
    "toplantiYeni": "Yeni Toplantı", "toplantiDetay": "Toplantı Detayı",
    "toplantiDuzenle": "Toplantıyı Düzenle", "toplantiGorevler": "Toplantı Görevleri",
    "uyeler": "Üyeler", "uyeYeni": "Yeni Üye", "uyeDetay": "Üye Detayı",
    "uyeDuzenle": "Üye Düzenle", "kullanicilar": "Kullanıcılar",
    "kullaniciYeni": "Yeni Kullanıcı", "kullaniciDuzenle": "Kullanıcıyı Düzenle",
    "denetimKaydi": "Denetim Kaydı", "profil": "Profil",
}
meta_de = {
    "panel": "Dashboard", "evrak": "Dokumente", "evrakYeni": "Neues Dokument",
    "evrakDetay": "Dokumentdetail", "evrakDuzenle": "Dokument bearbeiten",
    "evrakKategoriler": "Dokumentkategorien", "toplantilar": "Sitzungen",
    "toplantiYeni": "Neue Sitzung", "toplantiDetay": "Sitzungsdetail",
    "toplantiDuzenle": "Sitzung bearbeiten", "toplantiGorevler": "Aufgaben",
    "uyeler": "Mitglieder", "uyeYeni": "Neues Mitglied", "uyeDetay": "Mitgliederdetail",
    "uyeDuzenle": "Mitglied bearbeiten", "kullanicilar": "Benutzer",
    "kullaniciYeni": "Neuer Benutzer", "kullaniciDuzenle": "Benutzer bearbeiten",
    "denetimKaydi": "Prüfprotokoll", "profil": "Profil",
}
for lang, ns in [("tr", meta_tr), ("de", meta_de)]:
    p = BASE / f"messages/{lang}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    data["meta"] = ns
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"messages/{lang}.json meta OK")
