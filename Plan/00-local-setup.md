# Etapa 0: Setup Local

**Status**: TODO
**Prerequisites**: Ninguno

## Objetivo
Levantar un entorno Linux local con paridad de producción usando devcontainer, PostgreSQL local, MinIO y generación obligatoria de BAML antes del build.

## Comandos
```bash
pnpm install
pnpm exec baml-cli generate --from baml_src
pnpm build
mc alias set local http://minio:9000 minioadmin minioadmin
mc mb --ignore-existing local/agentnotes-audio-tmp
```

## Tareas
- [ ] Abrir el proyecto en el devcontainer.
- [ ] Confirmar que `.env.local` contiene `DO_SPACES_ENDPOINT=http://minio:9000` para desarrollo.
- [ ] Verificar que MinIO expone `9000` y `9001`.
- [ ] Verificar que PostgreSQL local responde en `postgres:5432`.
- [ ] Regenerar `baml_client/` dentro del contenedor Linux antes del build.

## Artefactos Generados
- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.dev.yml`
- `.devcontainer/post-create.sh`
- `.devcontainer/Dockerfile`

## Criterio de Salida
- [ ] `pnpm build` completa sin errores dentro del devcontainer Linux.
- [ ] El bucket `agentnotes-audio-tmp` existe en MinIO local.

## Siguiente Paso
Continuar con `Plan/01-infra-base.md`.