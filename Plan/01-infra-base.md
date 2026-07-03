# Etapa 1: Infraestructura Base

**Status**: TODO
**Prerequisites**: `Plan/00-local-setup.md`

## Objetivo
Dejar listo el spec productivo de App Platform, el health check, la base PostgreSQL gestionada y las variables de entorno mínimas para un único entorno cloud en production.

## Comandos
```bash
doctl apps spec validate .do/app.yaml
doctl apps create --spec .do/app.yaml
```

## Tareas
- [ ] Confirmar que `.do/app.yaml` usa `name: agentnotes` y `deploy_on_push: false`.
- [ ] Verificar que el `build_command` ejecuta `pnpm exec baml-cli generate --from baml_src` antes de `pnpm build`.
- [ ] Crear o adjuntar el clúster `agentnotes-db-cluster` con PostgreSQL 16.
- [ ] Verificar que `DATABASE_URL` llega como bindable var `${agentnotes-db.DATABASE_URL}`.
- [ ] Configurar `GOOGLE_AI_API_KEY`, `DO_SPACES_KEY`, `DO_SPACES_SECRET` y `DO_SPACES_REGION` en el entorno productivo.
- [ ] Completar el placeholder `${APP_DOMAIN}` con el dominio real antes del primer deploy.

## Artefactos Generados
- `.do/app.yaml`
- `app/api/health/route.ts`
- `db-setup.sql`

## Criterio de Salida
- [ ] `doctl apps spec validate .do/app.yaml` pasa sin errores.
- [ ] El endpoint `/api/health` responde `200` con `{ status: "ok" }`.
- [ ] App Platform reconoce el dominio de producción y el componente único `agentnotes`.

## Siguiente Paso
Continuar con `Plan/02-spaces-setup.md`.

```bash
aws --endpoint-url "https://${DO_SPACES_REGION}.digitaloceanspaces.com" \
  s3api put-bucket-cors \
  --bucket agentnotes-audio-tmp \
  --cors-configuration file://spaces-cors.json
```

Aplicar la expiración de un día al prefijo temporal con una regla equivalente a:

```json
{
  "Rules": [
    {
      "ID": "expire-agentnotes-audio-tmp",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "audio/tmp/"
      },
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

## Verificación
- [ ] `pnpm build` pasa dentro del devcontainer.
- [ ] `doctl apps spec validate .do/app.yaml` pasa con las variables del entorno cargadas.
- [ ] `psql "$DATABASE_URL" -c '\dn'` muestra el esquema `agentnotes`.
- [ ] El bucket responde a `aws s3 ls s3://agentnotes-audio-tmp --endpoint-url "https://${DO_SPACES_REGION}.digitaloceanspaces.com"`.

## Siguiente Paso
Continuar con `Plan/02-audio-flow.md`.