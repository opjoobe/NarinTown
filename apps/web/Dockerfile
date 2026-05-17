# NarinTown Web (Next.js) — Multi-stage build
# Build from monorepo root:
#   docker build -f apps/web/Dockerfile -t narintown-web .

# ===== Stage 1: deps =====
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

# ===== Stage 2: build =====
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @narintown/web build

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
EXPOSE 3000
CMD ["pnpm", "--filter", "@narintown/web", "start"]
