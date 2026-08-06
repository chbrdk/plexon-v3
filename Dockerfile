# PLEXON v3 – Docker image for Coolify / self-hosted.
# Context: repository root (plexon-v3).
# Sibling design system: clones github.com/chbrdk/msqdx-ui so webpack aliases resolve.
# Coolify: Dockerfile path `Dockerfile`, domain https://plexon-v3.projects-a.plygrnd.tech

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- Base ----
FROM ${NODE_IMAGE} AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# ---- Design system (msqdx-ui + legacy prismion for board) ----
FROM base AS ds
ARG MSQDX_UI_REPO=https://github.com/chbrdk/msqdx-ui.git
ARG MSQDX_UI_BRANCH=main
ARG MSQDX_DS_REPO=https://github.com/chbrdk/msqdx-design-system.git
ARG MSQDX_DS_BRANCH=main
RUN git clone --depth 1 -b "${MSQDX_UI_BRANCH}" "${MSQDX_UI_REPO}" /workspace/msqdx-ui \
    && cd /workspace/msqdx-ui \
    && pnpm install --frozen-lockfile \
    && pnpm build \
    && git clone --depth 1 -b "${MSQDX_DS_BRANCH}" "${MSQDX_DS_REPO}" /workspace/msqdx-design-system \
    && cd /workspace/msqdx-design-system \
    && npm install \
    && npm run build

# ---- Builder ----
FROM base AS builder
ARG MSQDX_UI_REPO=https://github.com/chbrdk/msqdx-ui.git
ARG MSQDX_UI_BRANCH=main
ARG MSQDX_DS_REPO=https://github.com/chbrdk/msqdx-design-system.git
ARG MSQDX_DS_BRANCH=main
# Keep deps installable even if Coolify injects NODE_ENV=production as a build ARG.
ENV NODE_ENV=development
COPY --from=ds /workspace/msqdx-ui /workspace/msqdx-ui
COPY --from=ds /workspace/msqdx-design-system /workspace/msqdx-design-system
COPY . /workspace/plexon-v3
WORKDIR /workspace/plexon-v3

# ds stage is often Docker-cached with a stale msqdx-ui main — refresh after app COPY so
# webpack aliases (lib/msqdx-ui.ts → ../msqdx-ui/packages/ui/src) match latest DS commits.
RUN cd /workspace/msqdx-ui \
    && git fetch origin "${MSQDX_UI_BRANCH}" --depth 1 \
    && git reset --hard "origin/${MSQDX_UI_BRANCH}" \
    && pnpm install --frozen-lockfile \
    && pnpm build \
    && cd /workspace/msqdx-design-system \
    && git fetch origin "${MSQDX_DS_BRANCH}" --depth 1 \
    && git reset --hard "origin/${MSQDX_DS_BRANCH}" \
    && npm install \
    && npm run build

# --include=dev: Coolify may force NODE_ENV=production before this stage; without it,
# typescript/devDeps can be omitted and `next build` fails oddly / gets OOM-killed mid-webpack.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --include=dev

RUN test -d /workspace/msqdx-ui/packages/ui/src \
    && test -f /workspace/msqdx-ui/packages/ui-tokens/dist/index.js \
    && test -f /workspace/msqdx-design-system/packages/react/src/index.ts

ENV MSQDX_UI_BASE=../msqdx-ui
ENV DS_BASE=../msqdx-design-system
ENV NODE_ENV=production
# Cap heap for Coolify hosts (~4–8 GB). Higher values invite cgroup OOM (exit 255, no Next error).
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DISABLE_SOURCEMAPS=1
# Coolify often marks app secrets "available at buildtime". Blank ONLY for this RUN so
# Next does not try live DB/auth during compile / page data collection.
RUN DATABASE_URL= \
    AUTH_SECRET= \
    AUTH_URL= \
    NEXTAUTH_SECRET= \
    NEXTAUTH_URL= \
    OPENAI_API_KEY= \
    npm run build

# ---- Runner ----
FROM ${NODE_IMAGE} AS runner
WORKDIR /workspace/plexon-v3

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV MSQDX_UI_BASE=../msqdx-ui
EXPOSE 3000

COPY --from=builder /workspace/plexon-v3/public ./public
COPY --from=builder /workspace/plexon-v3/.next ./.next
COPY --from=builder /workspace/plexon-v3/node_modules ./node_modules
COPY --from=builder /workspace/plexon-v3/package.json ./
COPY --from=builder /workspace/plexon-v3/lib ./lib
COPY --from=builder /workspace/plexon-v3/drizzle.config.ts ./
COPY --from=builder /workspace/plexon-v3/tsconfig.json ./
COPY --from=builder /workspace/plexon-v3/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /workspace/plexon-v3/scripts/check-database-url.mjs ./scripts/check-database-url.mjs
COPY --from=builder /workspace/plexon-v3/scripts/migrate-checkion-users-to-plexon.mjs ./scripts/migrate-checkion-users-to-plexon.mjs
COPY --from=builder /workspace/plexon-v3/scripts/migrate-product-projects-to-msqdx-company.mjs ./scripts/migrate-product-projects-to-msqdx-company.mjs
COPY --from=builder /workspace/msqdx-ui /workspace/msqdx-ui
COPY --from=builder /workspace/msqdx-design-system /workspace/msqdx-design-system
RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/check-database-url.mjs

CMD ["./scripts/docker-entrypoint.sh"]
