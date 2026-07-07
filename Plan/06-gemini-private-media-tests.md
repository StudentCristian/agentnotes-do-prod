# Gemini Private Media Tests

## Objetivo

Dejar validado que la transcripción de audio no depende de URLs públicas de Spaces ni de payloads base64 grandes hacia Gemini.

Configuración actual del flujo de audio:

- El navegador sube el audio original a Spaces mediante presigned PUT.
- El backend lee el objeto desde Spaces.
- El backend normaliza el audio a WAV PCM mono.
- El backend sube el WAV normalizado a Gemini Files API.
- La transcripción usa el `file_uri` devuelto por Gemini.

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

Ejecutar el flujo `upload-url -> PUT -> /api/transcribe -> /api/audio/delete`:

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
- objeto temporal retenido tras transcripción
- borrado manual temporal verificado
- transcripcion exitosa
- no debe aparecer `Cannot fetch content from the provided URL`
- no debe aparecer un error de tamaño por payload base64 hacia Gemini

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

La configuración BAML puede seguir siendo útil para otros medios, pero el flujo de audio productivo usa Gemini Files API para evitar depender de URLs públicas de Spaces o payloads base64 grandes.

## 6. Limitaciones

- En audio, la normalización WAV aumenta tamaño temporalmente; el WAV solo se usa para procesamiento.
- Si en el futuro un video o PDF excede el tamano aceptable, habra que usar otro flujo: Files API, URL publica real, almacenamiento accesible por el proveedor, o particion del archivo.
- El smoke test implementado hoy valida audio de punta a punta. Para `image`, `pdf` y `video` todavia no existe en esta repo un endpoint Gemini equivalente para ejecutar la misma prueba funcional.