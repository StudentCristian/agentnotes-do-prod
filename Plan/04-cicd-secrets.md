# Etapa 4: CI/CD y Secrets

**Status**: TODO
**Prerequisites**: `Plan/03-audio-flow.md`

## Objetivo
Desplegar a producción con GitHub Actions, sin staging y sin exponer secretos en logs o en el repositorio.

## Comandos
```bash
doctl apps spec validate .do/app.yaml
doctl apps create --spec .do/app.yaml
git push origin main
```

## Secrets de GitHub
- `DIGITALOCEAN_ACCESS_TOKEN`
- `GOOGLE_AI_API_KEY`
- `DO_SPACES_KEY`
- `DO_SPACES_SECRET`

## Tareas
- [ ] Crear los cuatro secrets en GitHub.
- [ ] Confirmar que `.github/workflows/deploy.yml` valida el spec antes de desplegar.
- [ ] Crear la app en DigitalOcean por primera vez con `doctl apps create --spec .do/app.yaml`.
- [ ] Confirmar que el workflow despliega por `app_name: agentnotes`.

## Artefactos Generados
- `.github/workflows/deploy.yml`

## Criterio de Salida
- [ ] Un push a `main` despliega sin errores.
- [ ] No se imprimen secretos en logs.

## Siguiente Paso
Continuar con `Plan/05-production.md`.