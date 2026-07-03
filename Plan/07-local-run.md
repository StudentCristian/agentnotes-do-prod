# 07 Local Run

## Objetivo

Levantar AgentNotes en local usando Docker para los servicios de backend y ejecutar el servidor Next.js dentro del contenedor `app`.

## Prerrequisitos

- Estar ubicado en la raíz del proyecto `AgentNote/`.
- Tener Docker Desktop o Docker Engine activo.
- Tener `.env.local` presente en la raíz del proyecto.

## Comandos usados

### 1. Levantar servicios Docker del entorno local

```bash
cd /mnt/c/Users/Pc/Desktop/agentnotesv1/agentnotes-do/AgentNote
docker compose -f docker-compose.dev.yml up -d postgres minio minio-init app
```

### 2. Verificar estado de los contenedores

```bash
docker compose -f docker-compose.dev.yml ps
```

### 3. Arrancar Next.js dentro del contenedor `app`

Este comando deja el servidor corriendo en segundo plano dentro del contenedor y escribe logs en `/tmp/agentnotes-next.log`.

```bash
docker exec -d agentnote-app-1 bash -lc 'cd /workspace && rm -f /tmp/agentnotes-next.log && setsid ./node_modules/.bin/next dev --hostname 0.0.0.0 > /tmp/agentnotes-next.log 2>&1 < /dev/null'
```

### 4. Verificar que Next.js quedó arriba

```bash
docker exec agentnote-app-1 bash -lc 'ps -ef | grep -E "next dev|next-server" | grep -v grep || true; echo ---; sed -n "1,120p" /tmp/agentnotes-next.log || true'
```

### 5. Comprobar healthcheck desde el contenedor

```bash
docker exec agentnote-app-1 bash -lc 'curl -i --max-time 20 http://127.0.0.1:3000/api/health'
```

### 6. Comprobar landing y sign-in desde el contenedor

```bash
docker exec agentnote-app-1 bash -lc 'curl -I --max-time 20 http://127.0.0.1:3000/ && echo --- && curl -I --max-time 20 http://127.0.0.1:3000/sign-in'
```

### 7. Comprobar acceso desde el host

```bash
curl -I --max-time 20 http://127.0.0.1:3000/
curl -I --max-time 20 http://127.0.0.1:3000/api/health
```

## URLs locales

- App: `http://localhost:3000`
- Sign in: `http://localhost:3000/sign-in`
- Healthcheck: `http://localhost:3000/api/health`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- PostgreSQL: `localhost:5432`

## Verificación esperada

- `GET /api/health` responde `200 OK` con JSON.
- `GET /` responde `200 OK`.
- `GET /sign-in` responde `200 OK`.
- `docker compose ps` muestra `postgres`, `minio` y `app` en estado `Up`.

## Ver logs de Next.js

```bash
docker exec agentnote-app-1 bash -lc 'sed -n "1,200p" /tmp/agentnotes-next.log'
```

## Detener el servidor Next.js dentro del contenedor

```bash
docker exec agentnote-app-1 bash -lc 'pkill -f "next dev|next/dist/bin/next dev|next-server" || true'
```

## Bajar el stack local

```bash
docker compose -f docker-compose.dev.yml down
```
