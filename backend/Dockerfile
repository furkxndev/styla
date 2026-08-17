# =============================================================================
# Kombin Backend - cok asamali (multi-stage) imaj
# Amac: derleme araclarini son imaja tasimadan kucuk ve non-root bir runtime.
# =============================================================================

# -----------------------------------------------------------------------------
# 1) deps - tum bagimliliklari (dev dahil) kurar; sadece manifest degisince yeniden calisir
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci


# -----------------------------------------------------------------------------
# 2) build - TypeScript'i dist/ altina derler
# -----------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build


# -----------------------------------------------------------------------------
# 3) prod-deps - yalnizca uretim bagimliliklari (dev paketleri imaja girmesin)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS prod-deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force


# -----------------------------------------------------------------------------
# 4) runner - calisan imaj
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    API_PREFIX=api/v1

# wget healthcheck icin gerekli (alpine'da busybox wget mevcut, ek kurulum yok)
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

# Local storage surucusunun yazdigi klasor; compose bunu volume ile disari baglar
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
VOLUME ["/app/uploads"]

# Root olarak calistirma - imajdaki hazir "node" kullanicisini kullan
USER node

EXPOSE 4000

# API_PREFIX/PORT calisma aninda degisebilir; shell formu env genisletmesi yapar
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT:-4000}/${API_PREFIX:-api/v1}/health" || exit 1

CMD ["node", "dist/main"]
