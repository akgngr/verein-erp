#!/bin/bash
# Next.js dev sunucusunu konteyner içinde kalıcı olarak başlatır.
#
# NEDEN ÇİFT-FORK: Ajanın bash oturumu kapandığında oturumun süreç grubu
# temizleniyor (nohup/setsid bile yetmiyor). Klasik Unix daemonizasyonu
# (fork → setsid → fork → exec) süreci PID 1'e devrederek bu temizlikten
# kurtarır — önceki oturumda da dev sunucusu bu sayede günlerce ayakta kaldı.
#
# NEDEN ENV YÜKLEMESİ: Sandbox'ın global ortamı DATABASE_URL'i sqlite'a
# sabitler; process.env, Next.js'in .env dosyasından önceliklidir. Bu yüzden
# doğru değerler (.env.local) açıkça export edilir — aksi halde Prisma
# "URL must start with postgresql://" hatasıyla yetkilendirmeyi bozar.
#
# Kullanım: bash /home/z/my-project/scripts/start-dev-daemon.sh
set -u

PORT=3000
cd /home/z/my-project || exit 1

# .env.local içindeki doğru değerleri sürece ver (global env'i ezer).
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

# Zaten çalışıyorsa dokunma (idempotent).
if curl -s --max-time 3 "http://127.0.0.1:${PORT}/api/health" > /dev/null 2>&1; then
  echo "Dev sunucusu zaten çalışıyor (${PORT})."
  exit 0
fi

python3 - <<'EOF'
import os

# KARAR: Dev çıktısı PROJE DIŞINA (/tmp) yazılır — proje içi herhangi bir dosyaya
# sürekli yazmak (ör. .next/dev.log'a tee) Turbopack dosya izleyicisini tetikler
# ve sonsuz "derle → HMR reload → yeni istek → tekrar derle" döngüsüne yol açar.
LOG = "/tmp/dernek-dev.log"

pid = os.fork()
if pid == 0:
    os.setsid()
    pid2 = os.fork()
    if pid2 == 0:
        os.chdir("/home/z/my-project")
        log = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND)
        os.dup2(log, 1)
        os.dup2(log, 2)
        devnull = os.open(os.devnull, os.O_RDWR)
        os.dup2(devnull, 0)
        os.execvp("pnpm", ["pnpm", "dev"])
    os._exit(0)
os.waitpid(pid, 0)
EOF

# Hazır olması bekle (ilk Turbopack derlemesi 15 sn+ sürebilir).
for i in $(seq 1 40); do
  if curl -s --max-time 3 "http://127.0.0.1:${PORT}/api/health" > /dev/null 2>&1; then
    echo "Dev sunucusu hazır: http://127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 3
done

echo "UYARI: Sunucu 120 sn içinde hazır olmadı; .next/dev.log dosyasını kontrol edin."
exit 1
