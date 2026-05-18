# NarinTown Game Server (Fastify + Socket.IO) — Multi-stage build
# Build from monorepo root:
#   docker build -f apps/game-server/Dockerfile -t narintown-game-server .

# ===== Stage 1: deps =====
FROM node:20-alpine AS deps
# bcrypt 등 native module 컴파일에 필요한 toolchain
RUN apk add --no-cache python3 make g++ openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/game-server/package.json apps/game-server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

# ===== Stage 2: build =====
FROM node:20-alpine AS build
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @narintown/game-server prisma:generate
RUN pnpm --filter @narintown/shared build || true
RUN pnpm --filter @narintown/game-server build

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/game-server/dist ./apps/game-server/dist
COPY --from=build /app/apps/game-server/prisma ./apps/game-server/prisma
COPY --from=build /app/apps/game-server/package.json ./apps/game-server/
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3001
# 마이그레이션 실행 후 서버 부팅 (DB 스키마 자동 동기화)
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ./apps/game-server/prisma/schema.prisma && node apps/game-server/dist/index.js"]
