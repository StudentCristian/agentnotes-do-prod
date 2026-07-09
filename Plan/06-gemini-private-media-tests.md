# BAML Signed Audio URL Tests

## Objetivo

Dejar validado que la transcripción de audio usa BAML con URL firmada temporal de lectura sobre Spaces privados, sin depender de URLs públicas ni de payloads base64 grandes.

Configuración actual del flujo de audio:

- El navegador sube el audio original a Spaces mediante presigned PUT.
- El backend genera una URL firmada temporal de lectura para el objeto privado.
- El backend invoca BAML con `Audio.fromUrl(...)`.
- El provider Google AI recibe la URL con `send_url`.

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
- transcripcion BAML exitosa con salida estructurada valida
- borrado manual temporal verificado
- no debe aparecer `Cannot fetch content from the provided URL`
- no debe aparecer un error de tamaño por payload base64 hacia Gemini
- no debe aparecer uso activo de Gemini Files API en el camino de produccion

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

## 5. Camino legado

La implementacion basada en `lib/gemini-files-client.ts` se conserva como flujo legado y fallback de referencia. No debe ser el camino activo mientras BAML con URL firmada funcione de forma confiable.

## 6. Limitaciones

- Si el proveedor no puede leer de forma consistente la URL firmada de Spaces, la migracion debe revertirse temporalmente al flujo legado de Gemini Files API.
- Si en el futuro un video o PDF excede el tamano aceptable, habra que usar otro flujo: Files API, URL publica real, almacenamiento accesible por el proveedor, o particion del archivo.
- El smoke test implementado hoy valida audio de punta a punta. Para `image`, `pdf` y `video` todavia no existe en esta repo un endpoint Gemini equivalente para ejecutar la misma prueba funcional.