#!/usr/bin/env bash
# Faz 2 Adım 2 regresyon testi: documents modülü davranışı değişmedi mi?
# Kullanım: bash scripts/test-phase1-regression.sh
set -uo pipefail

BASE="http://127.0.0.1:3000"
JAR="/tmp/reg-cookies.txt"
PASS=0; FAIL=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS: $1 ($3)"; else FAIL=$((FAIL+1)); echo "FAIL: $1 (beklenen=$2, gelen=$3)"; fi
}
# KARAR: NextAuth credentials callback başarılı girişte 302 döner (session cookie Set-Cookie ile gelir).
check_contains() {
  if echo "$3" | grep -qF "$2"; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 (aranan='$2' yok)"; fi
}

rm -f "$JAR"

# 1) CSRF + login (NextAuth credentials akışı)
CSRF_JSON=$(curl -s -c "$JAR" "$BASE/api/auth/csrf")
CSRF=$(echo "$CSRF_JSON" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=sekreter@dernek.local" \
  --data-urlencode "password=Sekreter1234" \
  "$BASE/api/auth/callback/credentials")
check "login HTTP" "302" "$LOGIN_CODE"

# 2) Session doğrulaması
SESSION=$(curl -s -b "$JAR" "$BASE/api/auth/session")
check_contains "session sekreter" "sekreter@dernek.local" "$SESSION"

# 3) Test edilecek evrakı bul (GLN-2026-0001)
DOC_ID=$(curl -s -b "$JAR" "$BASE/api/health" >/dev/null; PGPASSWORD="" psql_status=$?; \
  /home/z/.pgtools/postgresql-17.6.0-x86_64-unknown-linux-gnu/bin/psql "postgresql://postgres@127.0.0.1:5432/dernek" -tAc "SELECT id FROM \"Document\" WHERE \"registryNumber\"='GLN-2026-0001' LIMIT 1")
[ -n "$DOC_ID" ] || { echo "FAIL: test evrağı bulunamadı"; exit 1; }
echo "DOC_ID=$DOC_ID"

printf '%s\n' "%PDF-1.4 minimal test" > /tmp/real.pdf
printf '%s\n' "<svg xmlns='http://www.w3.org/2000/svg'></svg>" > /tmp/fake.pdf
printf '%s\n' "merhaba dünya" > /tmp/not.txt

# 4) SVG'nin .pdf adıyla yüklenmesi REDDEDİLMELİ (magic byte)
R1=$(curl -s -b "$JAR" -o /tmp/r1.json -w "%{http_code}" -F "file=@/tmp/fake.pdf;type=application/pdf" "$BASE/api/documents/$DOC_ID/files")
check "sahte pdf reddi HTTP" "400" "$R1"
check_contains "sahte pdf mesajı" "uyumlu değil" "$(cat /tmp/r1.json)"

# 5) txt: Faz 1'de İZİNLİ (signature none) — 200 beklenir
R2=$(curl -s -b "$JAR" -o /tmp/r2.json -w "%{http_code}" -F "file=@/tmp/not.txt;type=text/plain" "$BASE/api/documents/$DOC_ID/files")
check "txt kabul HTTP" "200" "$R2"

# 6) Oturumsuz yükleme 401
R3=$(curl -s -o /dev/null -w "%{http_code}" -F "file=@/tmp/real.pdf;type=application/pdf" "$BASE/api/documents/$DOC_ID/files")
check "oturumsuz 401" "401" "$R3"

# 7) Gerçek PDF yükleme 200
R4=$(curl -s -b "$JAR" -o /tmp/r4.json -w "%{http_code}" -F "file=@/tmp/real.pdf;type=application/pdf" "$BASE/api/documents/$DOC_ID/files")
check "gerçek pdf HTTP" "200" "$R4"
FILE_ID=$(sed -E 's/.*"id":"([^"]+)".*/\1/' /tmp/r4.json)
echo "FILE_ID=$FILE_ID"

# 8) İndirme başlıkları
R5=$(curl -s -b "$JAR" -D /tmp/r5.h -o /tmp/r5.pdf -w "%{http_code}" "$BASE/api/documents/files/$FILE_ID")
check "indirme HTTP" "200" "$R5"
check_contains "nosniff" "nosniff" "$(cat /tmp/r5.h)"
check_contains "private no-store" "private, no-store" "$(cat /tmp/r5.h)"
check_contains "RFC5987" "filename*=UTF-8''" "$(cat /tmp/r5.h)"
check_contains "attachment" "attachment" "$(cat /tmp/r5.h)"
check_contains "PDF gövde" "%PDF" "$(head -c 20 /tmp/r5.pdf)"

# 9) inline=1 pdf → inline
check_contains "inline pdf" "inline; " "$(curl -s -b "$JAR" -D - -o /dev/null "$BASE/api/documents/files/$FILE_ID?inline=1" | grep -i content-disposition)"

# 10) VIEWER yetkisiz yükleme 403 (sekreter değil viewer yok; admin ile zaten 200) — psql ile dosya sayısı arttı mı?
CNT=$(/home/z/.pgtools/postgresql-17.6.0-x86_64-unknown-linux-gnu/bin/psql "postgresql://postgres@127.0.0.1:5432/dernek" -tAc "SELECT count(*) FROM \"DocumentFile\" WHERE \"documentId\"='$DOC_ID' AND \"deletedAt\" IS NULL")
echo "aktif dosya sayısı: $CNT"

echo "=== SONUÇ: PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" = "0" ]
