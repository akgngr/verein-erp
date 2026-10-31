# syntax=docker/dockerfile:1

# Yalnızca sunucuda (Coolify) imaj üretmek içindir; yerel geliştirme Docker kullanmaz (13. bölüm).

# ---------- deps ----------
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Prisma client postinstall, şema yoksa uyarıyla atlar (builder aşamasında üretilir).
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate build aşamasında (13. bölüm)
RUN pnpm exec prisma generate
RUN pnpm build
# Migrator için şema bağlantılarını gerçek dosyalara çevir.
RUN cp -rL prisma /app/prisma-resolved

# ---------- migrator ----------
# Konteyner açılışındaki `prisma migrate deploy` + bütünlük kontrolü için ayrı, düz (npm) bir
# node_modules: pnpm'in sembolik bağlantıları runner'a kopyalanamaz. Sürümler package.json'dan okunur.
FROM node:22-alpine AS migrator
WORKDIR /app/migrate
COPY package.json /tmp/app-package.json
RUN node -e 'const p=require("/tmp/app-package.json");const all={...p.dependencies,...p.devDependencies};const want=["prisma","@prisma/client","@prisma/adapter-pg","pg","@next/env"];for(const n of want){if(!all[n])throw new Error("missing "+n)};require("fs").writeFileSync("package.json",JSON.stringify({private:true,type:"commonjs",dependencies:Object.fromEntries(want.map(n=>[n,all[n]]))},null,2))' \
  && npm install --omit=dev --no-audit --no-fund --ignore-scripts
# prisma/schema altındaki modül şemaları sembolik bağlantıdır; builder'da gerçek dosyaya çevrilmiş kopya.
COPY --from=builder /app/prisma-resolved ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts/verify-db-integrity.mjs ./scripts/verify-db-integrity.mjs
# Şemayı doğrulayan bütünlük betiği için istemci (veritabanı adresi gerekmez).
RUN node_modules/.bin/prisma generate


# ---------- runner ----------
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# KARAR (Faz 2, 9. bölüm): tutanak PDF fontları process.cwd() üzerinden okunur;
# standalone çıktıya tracing dahil olsa da runner imajına açıkça kopyalanır.
COPY --from=builder --chown=nextjs:nodejs /app/src/modules/meetings/assets/fonts ./src/modules/meetings/assets/fonts

# `prisma migrate deploy` + A-1.4 bütünlük doğrulaması: CLI, şema, migration geçmişi, prisma.config.ts
COPY --from=migrator /app/migrate ./migrate

# Evrak dosya depolaması (Faz 1): kalıcı volume bağlanacak klasör,
# root olmayan kullanıcıya verilir; UPLOAD_DIR varsayılanı bu yoldur.
RUN mkdir -p /app/storage/uploads \
  && chown -R nextjs:nodejs /app/storage
ENV UPLOAD_DIR=/app/storage/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Konteyner başlangıcında migration → bütünlük doğrulaması → uygulama (13. bölüm, A-1.4).
# Değişmezlik trigger'ları eksikse veya bir migration uygulanmamışsa konteyner BAŞLAMAZ.
CMD ["sh", "-c", "cd /app/migrate && node_modules/.bin/prisma migrate deploy && node scripts/verify-db-integrity.mjs && cd /app && node server.js"]
