# 07 Local Run

## Estado

Este documento reemplaza el runbook heredado con Postgres y MinIO locales.

## Objetivo

Levantar AgentNotes en local usando Docker solo para la aplicación y consumir servicios reales de DigitalOcean definidos en `.env.local`.

## Prerrequisitos

- Estar ubicado en la raíz del repositorio.
- Tener Docker Desktop o Docker Engine activo.
- Tener `.env.local` creado a partir de `.env.example` con valores reales.

## Flujo oficial

### 1. Levantar el contenedor de aplicación

```bash
docker compose -f docker-compose.dev.yml up -d app
```

### 2. Verificar estado del contenedor

```bash
docker compose -f docker-compose.dev.yml ps
```

### 3. Instalar dependencias y generar cliente BAML

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && CI=true pnpm install --config.confirmModulesPurge=false && pnpm exec baml-cli generate --from baml_src'
```

### 4. Arrancar Next.js dentro del contenedor

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm dev --hostname 0.0.0.0'
```

### 5. Validación manual mínima

```bash
curl -i http://127.0.0.1:3000/api/health
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/sign-in
```

### 6. Validaciones opcionales

```bash
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm build'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm lint'
docker exec -it agentnotes-do-prod-app-1 bash -lc 'cd /workspace && pnpm smoke:audio'
```

## URLs locales

- App: `http://localhost:3000`
- Sign in: `http://localhost:3000/sign-in`
- Healthcheck: `http://localhost:3000/api/health`

## Verificación esperada

- `GET /api/health` responde `200 OK` con JSON.
- `GET /` responde `200 OK`.
- `GET /sign-in` responde `200 OK`.
- `docker compose ps` muestra solo `app` en estado `Up`.

## Bajar el stack local

```bash
docker compose -f docker-compose.dev.yml down
```
