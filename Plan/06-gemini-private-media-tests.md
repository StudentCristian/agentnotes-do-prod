# Gemini Private Media Tests

## Objetivo

Dejar validado que BAML no reenvia URLs privadas o locales directamente a Gemini.

Configuracion actual en `baml_src/clients.baml`:

- `audio "send_base64"`
- `image "send_base64"`
- `pdf "send_base64"`
- `video "send_base64"`

Esto obliga a BAML a descargar la URL en el servidor y enviar el media embebido al proveedor.

## 1. Regenerar el cliente BAML

Desde la raiz de `AgentNote`:

```bash
pnpm exec baml-cli generate --from baml_src
```

## 2. Reiniciar la app local en Docker

Recrear el servicio `app`:

```bash
docker compose -f docker-compose.dev.yml up -d --force-recreate app
```

Levantar `next dev` dentro del contenedor:

```bash
docker exec -d agentnote-app-1 bash -lc 'pkill -f "next dev|next start" || true; cd /workspace && ./node_modules/.bin/next dev --hostname 0.0.0.0 > /tmp/agentnotes-app.log 2>&1'
```

Verificar healthcheck:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

## 3. Smoke test actual de audio

Ejecutar el flujo `upload-url -> PUT -> /api/transcribe -> delete`:

```bash
DO_SPACES_KEY=minioadmin DO_SPACES_SECRET=minioadmin node scripts/smoke-audio-flow.mjs --base-url http://127.0.0.1:3000
```

Capturando salida a archivo:

```bash
rm -f /tmp/agentnotes-smoke.log
DO_SPACES_KEY=minioadmin DO_SPACES_SECRET=minioadmin node scripts/smoke-audio-flow.mjs --base-url http://127.0.0.1:3000 > /tmp/agentnotes-smoke.log 2>&1
cat /tmp/agentnotes-smoke.log
```

Resultado esperado:

- upload temporal verificado
- borrado temporal verificado
- transcripcion exitosa
- no debe aparecer `Cannot fetch content from the provided URL`

## 4. Logs utiles

Build dentro del contenedor:

```bash
docker exec agentnote-app-1 bash -lc 'cat /tmp/agentnotes-build.log'
```

Servidor `next dev`:

```bash
docker exec agentnote-app-1 bash -lc 'tail -n 200 /tmp/agentnotes-app.log'
```

Log interno de Next:

```bash
docker exec agentnote-app-1 bash -lc 'tail -n 200 /workspace/.next/dev/logs/next-development.log'
```

## 5. Nota para futuros media types

La configuracion ya cubre `audio`, `image`, `pdf` y `video` cuando la URL sea privada, local o firmada.

## 6. Limitaciones

- `video "send_base64"` puede no ser viable para archivos grandes por tamano de request o limites del proveedor.
- Si en el futuro un video o PDF excede el tamano aceptable, habra que usar otro flujo: URL publica real, almacenamiento accesible por el proveedor, o particion del archivo.
- El smoke test implementado hoy valida audio de punta a punta. Para `image`, `pdf` y `video` todavia no existe en esta repo un endpoint Gemini equivalente para ejecutar la misma prueba funcional.