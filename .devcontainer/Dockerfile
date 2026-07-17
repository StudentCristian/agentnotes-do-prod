FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends awscli jq \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

RUN mkdir -p /home/node/.local/share/pnpm \
  && chown -R node:node /home/node/.local

USER node