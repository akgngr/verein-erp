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

# ---------- runner ----------
FROM node:22-alpine AS runner
# Prisma motorları için openssl
RUN apk add --no-cache openssl
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

# `prisma migrate deploy` için CLI + şema + migration geçmişi
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Evrak dosya depolaması (Faz 1): kalıcı volume bağlanacak klasör,
# root olmayan kullanıcıya verilir; UPLOAD_DIR varsayılanı bu yoldur.
RUN mkdir -p /app/storage/uploads \
  && chown -R nextjs:nodejs /app/storage
ENV UPLOAD_DIR=/app/storage/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Konteyner başlangıcında migration, ardından uygulama (13. bölüm)
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
