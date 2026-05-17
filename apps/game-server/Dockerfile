# NarinTown Game Server (Fastify + Socket.IO) — Multi-stage build
# Build from monorepo root:
#   docker build -f apps/game-server/Dockerfile -t narintown-game-server .

# ===== Stage 1: deps =====
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/game-server/package.json apps/game-server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

# ===== Stage 2: build =====
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @narintown/game-server prisma:generate
RUN pnpm --filter @narintown/shared build || true
RUN pnpm --filter @narintown/game-server build

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/game-server/dist ./apps/game-server/dist
COPY --from=build /app/apps/game-server/prisma ./apps/game-server/prisma
COPY --from=build /app/apps/game-server/package.json ./apps/game-server/
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["node", "apps/game-server/dist/index.js"]
