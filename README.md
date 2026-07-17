# AgentNotes

## Local development

The official local workflow is defined in [docs/adr/001-local-docker-run.md](docs/adr/001-local-docker-run.md).

- Docker is used only for the application container.
- Local development uses real DigitalOcean services through `.env.local`.
- The repository contract is `Node 22.x` and `pnpm@11.9.0`.

### Required local files

1. Copy `.env.example` to `.env.local`.
2. Fill `.env.local` with real values for Clerk, Edge Store, Google AI, DigitalOcean Spaces, and PostgreSQL.

### Start the local container

```bash
docker compose -f docker-compose.dev.yml up -d app
```

### Install dependencies and generate BAML client

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && CI=true pnpm install --config.confirmModulesPurge=false && pnpm exec baml-cli generate --from baml_src'
```

### Start Next.js in development mode

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm dev --hostname 0.0.0.0'
```

### Minimal manual validation

```bash
curl -i http://127.0.0.1:3000/api/health
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/sign-in
```

### Optional validation commands

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm build'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm lint'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm smoke:audio'
```

### Stop the local container

```bash
docker compose -f docker-compose.dev.yml down
```
