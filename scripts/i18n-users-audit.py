#!/usr/bin/env python3
"""Task 15: users/audit PageHeader için minimal namespace eki (idempotent)."""
import json
from pathlib import Path

ROOT = Path("/home/z/my-project/messages")

TR = {
    "users": {
        "pageTitle": "Kullanıcılar",
        "pageDescription": "Sistem kullanıcıları, rolleri ve durumları.",
        "newUser": "Yeni kullanıcı",
        "createTitle": "Yeni Kullanıcı",
        "createDescription": "Sisteme yeni bir kullanıcı ekleyin. Kullanıcı ilk girişte parolasını değiştirmeye zorlanır.",
        "editTitle": "Kullanıcıyı Düzenle",
        "notFoundTitle": "Kullanıcı bulunamadı",
        "notFoundDescription": "Kayıt silinmiş olabilir.",
    },
    "audit": {
        "pageTitle": "Denetim Kaydı",
        "pageDescription": "Sistemde gerçekleşen kimlik doğrulama ve veri işlemleri.",
    },
}

DE = {
    "users": {
        "pageTitle": "Benutzer",
        "pageDescription": "Systembenutzer, Rollen und Status.",
        "newUser": "Neuer Benutzer",
        "createTitle": "Neuer Benutzer",
        "createDescription": "Fügen Sie dem System einen neuen Benutzer hinzu. Der Benutzer muss beim ersten Anmelden sein Passwort ändern.",
        "editTitle": "Benutzer bearbeiten",
        "notFoundTitle": "Benutzer nicht gefunden",
        "notFoundDescription": "Der Datensatz könnte gelöscht worden sein.",
    },
    "audit": {
        "pageTitle": "Prüfprotokoll",
        "pageDescription": "Authentifizierungs- und Datenoperationen im System.",
    },
}


def main():
    for locale, ns in (("tr", TR), ("de", DE)):
        path = ROOT / f"{locale}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data.update(ns)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        json.loads(path.read_text(encoding="utf-8"))
        print(f"{locale}: users + audit eklendi")


if __name__ == "__main__":
    main()
