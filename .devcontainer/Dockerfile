FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends awscli jq postgresql-client \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
  && chmod +x /usr/local/bin/mc

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

USER node