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

### Prisma workflows

`DATABASE_URL` is the pooled runtime connection string used by the Next.js app. `DIRECT_URL` is the direct database connection string used by Prisma CLI workflows such as introspection, migrations, and Studio.

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm prisma:generate'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm prisma:validate'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm prisma:pull'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm prisma:migrate:status'
```

Only run `prisma:pull` or migration commands after `.env.local` contains `DIRECT_URL` for the direct PostgreSQL connection and the `agentnotes` schema.

### Stop the local container

```bash
docker compose -f docker-compose.dev.yml down
```

## DigitalOcean App Platform deployment

App Platform runtime must receive `DATABASE_URL` as the pooled PostgreSQL connection string. Do not use the direct database URL for app runtime traffic.

Keep `DIRECT_URL` as a GitHub Actions production secret for operational Prisma workflows only. It is passed to the rollout script for validation, but it is not rendered into `.do/app.yaml` and is not required by the app container.

Required production secrets:

- `DATABASE_URL`: pooled runtime connection string, expected on DigitalOcean pool port `25061`.
- `DIRECT_URL`: direct PostgreSQL connection string for Prisma migrations/introspection, expected on port `25060` with `schema=agentnotes`.

The deployment script rejects a non-pooled `DATABASE_URL` and rejects a pooled `DIRECT_URL` before updating App Platform.
