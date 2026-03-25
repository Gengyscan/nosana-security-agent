# syntax=docker/dockerfile:1

FROM oven/bun:1-slim AS bun-bin

FROM node:23-slim

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  git \
  && rm -rf /var/lib/apt/lists/*

# Bun for Nosana vLLM compatibility proxy
COPY --from=bun-bin /usr/local/bin/bun /usr/local/bin/bun

ENV ELIZAOS_TELEMETRY_DISABLED=true
ENV DO_NOT_TRACK=1

WORKDIR /app
RUN npm install -g pnpm

# Install dependencies (devDependencies needed for tsup build + postinstall patch)
COPY package.json ./
COPY scripts/patch-plugin-openai.mjs scripts/
RUN pnpm install

# Copy source and build security scanner plugin
COPY . .
RUN pnpm build

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV SERVER_PORT=3000
ENV PROXY_PORT=3001
ENV OPENAI_BASE_URL=http://localhost:3001/v1
ENV OPENAI_API_KEY=nosana

EXPOSE 3000

# Start vLLM compatibility proxy, then ElizaOS
CMD ["sh", "-c", "bun run scripts/nosana-proxy.ts & sleep 2 && pnpm start"]
