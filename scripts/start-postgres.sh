#!/bin/bash
# Userspace PostgreSQL'i (17.6) idempotent olarak başlatır.
#
# NEDEN: Sandbox yeniden başladığında bu PostgreSQL örneği ( /home/z/.pgdata )
# kendiliğinden açılmaz; uygulama PostgreSQL şartı gereği buna bağlıdır.
# Betik; pg_isready hazırsa dokunmaz, veri dizini yoksa initdb yapar,
# "dernek" veritabanı yoksa oluşturur.
#
# Kullanım: bash /home/z/my-project/scripts/start-postgres.sh
set -u

BIN=/home/z/.pgtools/postgresql-17.6.0-x86_64-unknown-linux-gnu/bin
PGDATA=/home/z/.pgdata
HOST=127.0.0.1
PORT=5432
DB=dernek

if [ ! -x "$BIN/pg_ctl" ]; then
  echo "HATA: PostgreSQL bulunamadı: $BIN"
  exit 1
fi

# 1) Zaten hazır mı?
if "$BIN/pg_isready" -h "$HOST" -p "$PORT" > /dev/null 2>&1; then
  echo "PostgreSQL zaten çalışıyor (${HOST}:${PORT})."
else
  # 2) Veri dizini yoksa ilklendir.
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Veri dizini yok; initdb çalıştırılıyor ($PGDATA)..."
    mkdir -p "$PGDATA"
    "$BIN/initdb" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 --locale=C > /tmp/initdb.log 2>&1 \
      || { echo "HATA: initdb başarısız (/tmp/initdb.log)"; exit 1; }
  fi
  # 3) Başlat (pg_ctl süreci daemonize eder; bash oturumundan bağımsız yaşar).
  echo "PostgreSQL başlatılıyor..."
  "$BIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" \
    -o "-p $PORT -c listen_addresses=$HOST" start > /tmp/pgctl.log 2>&1 \
    || { echo "HATA: pg_ctl start başarısız (/tmp/pgctl.log)"; exit 1; }
  # 4) Hazır olması bekle.
  for i in $(seq 1 20); do
    "$BIN/pg_isready" -h "$HOST" -p "$PORT" > /dev/null 2>&1 && break
    sleep 1
  done
  "$BIN/pg_isready" -h "$HOST" -p "$PORT" > /dev/null 2>&1 \
    || { echo "HATA: PostgreSQL 20 sn içinde hazır olmadı."; exit 1; }
  echo "PostgreSQL hazır."
fi

# 5) Uygulama veritabanı mevcut mu?
if ! "$BIN/psql" -h "$HOST" -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
  echo "'$DB' veritabanı yok; oluşturuluyor..."
  "$BIN/createdb" -h "$HOST" -U postgres "$DB"
  echo "Oluşturuldu: $DB"
else
  echo "Veritabanı mevcut: $DB"
fi

exit 0
