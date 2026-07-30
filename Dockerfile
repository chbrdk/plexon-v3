# PLEXON – Docker image for Coolify/self-hosted deployment.
# Build: docker build -t plexon .
# Run:   docker run -p 3000:3000 -e AUTH_SECRET=... -e DATABASE_URL=... plexon
# Port 3000 = Next.js default. Mit DATABASE_URL wird beim Start drizzle-kit push ausgeführt.
# Optional: MIGRATION_MSQDX_PLATFORM_PROJECTS → Plattform-Projekte msqdx (CHECKION-User-Migration nur manuell, nicht im Entrypoint).

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- Base ----
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- Design system (file:../msqdx-design-system must resolve in /app) ----
# Klont den angegebenen Branch (default: main). Wenn Prismion/Board-Komponenten auf einem anderen Branch sind:
#   docker build --build-arg DESIGN_SYSTEM_BRANCH=develop -t plexon .
FROM base AS deps
ARG DESIGN_SYSTEM_REPO=https://github.com/chbrdk/msqdx-design-system.git
ARG DESIGN_SYSTEM_BRANCH=main
RUN git clone --depth 1 -b "${DESIGN_SYSTEM_BRANCH}" "${DESIGN_SYSTEM_REPO}" /msqdx-design-system \
    && cd /msqdx-design-system && npm install && npm run build

# ---- Builder ----
FROM base AS builder
# Install must include devDependencies (typescript, @types/*) for `next build` typecheck.
# Do not rely on Next.js auto-installing TypeScript at build time — that extra `npm install` often fails
# in CI (network, timeouts, exit 255) when NODE_ENV=production would omit devDependencies.
ENV NODE_ENV=development
COPY --from=deps /msqdx-design-system /msqdx-design-system
# So file:../MSQDX-DS/msqdx-design-system resolves when we npm install in this stage
RUN mkdir -p /MSQDX-DS && ln -snf /msqdx-design-system /MSQDX-DS/msqdx-design-system
COPY package.json package-lock.json* ./
COPY . .

# Install deps in builder so node_modules is fresh (avoids stale cache from deps stage).
# npm ci is reproducible; .npmrc relaxes optional peer conflicts; --no-audit/--no-fund reduces CI noise and edge failures.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund
# Replace @msqdx symlinks with built package content so webpack resolves @msqdx/react
RUN cd /msqdx-design-system && npm run build \
  && mkdir -p ./node_modules/@msqdx \
  && rm -rf ./node_modules/@msqdx/react ./node_modules/@msqdx/tokens \
  && cp -r /msqdx-design-system/packages/react ./node_modules/@msqdx/react \
  && cp -r /msqdx-design-system/packages/tokens ./node_modules/@msqdx/tokens \
  && test -f ./node_modules/@msqdx/react/dist/index.d.ts \
  && test -f ./node_modules/@msqdx/tokens/dist/index.d.ts \
  && test -f /msqdx-design-system/packages/react/src/index.ts
ENV DS_BASE=../MSQDX-DS/msqdx-design-system
ENV NODE_ENV=production
# Next "Collecting build traces" can be memory-heavy on small build workers
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run build

# ---- Runner ----
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
EXPOSE 3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

COPY --from=builder /app/lib ./lib
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /app/scripts/migrate-checkion-users-to-plexon.mjs ./scripts/migrate-checkion-users-to-plexon.mjs
COPY --from=builder /app/scripts/migrate-product-projects-to-msqdx-company.mjs ./scripts/migrate-product-projects-to-msqdx-company.mjs
RUN chmod +x ./scripts/docker-entrypoint.sh

CMD ["./scripts/docker-entrypoint.sh"]
