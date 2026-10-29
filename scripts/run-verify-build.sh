#!/bin/bash
# Faz 2 doğrulama build'i: dev sunucusu DURDURULUR, izole distDir ile build alınır.
# Kullanım: bash scripts/run-verify-build.sh
cd /home/z/my-project || exit 1

# Dev sunucuyu durdur (OOM'u önlemek için).
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 3

rm -rf .next-build
export NEXT_DIST_DIR=.next-build
pnpm exec next build
echo "BUILD_EXIT_CODE:$?"
