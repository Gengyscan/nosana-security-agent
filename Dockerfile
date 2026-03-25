# syntax=docker/dockerfile:1

FROM node:23-slim AS base

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  git \
  && rm -rf /var/lib/apt/lists/*

ENV ELIZAOS_TELEMETRY_DISABLED=true
ENV DO_NOT_TRACK=1

WORKDIR /app
RUN npm install -g pnpm

FROM base AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN pnpm install
COPY frontend/ ./
RUN pnpm build

FROM base AS app
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
COPY --from=frontend-builder /app/frontend/dist /app/frontend-dist
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV SERVER_PORT=3000
ENV FRONTEND_PORT=4173

EXPOSE 3000
EXPOSE 4173

CMD ["sh", "-c", "pnpm start & node ./scripts/serve-frontend.mjs"]
