# Etapa 2: Spaces

**Status**: TODO
**Prerequisites**: `Plan/01-infra-base.md`

## Objetivo
Configurar el bucket productivo y el entorno local S3-compatible para el audio temporal con presigned URLs y expiración de respaldo.

## Comandos
```bash
s3cmd setcors spaces-cors.json s3://agentnotes-audio-prod
aws --endpoint-url http://localhost:9000 s3 ls s3://agentnotes-audio-tmp
```

## Tareas
- [ ] Crear el bucket productivo `agentnotes-audio-prod`.
- [ ] Confirmar que el bucket local MinIO es `agentnotes-audio-tmp`.
- [ ] Reservar el prefijo `audio/tmp/` para archivos temporales.
- [ ] Aplicar `spaces-cors.json` al bucket productivo.
- [ ] Configurar una lifecycle rule para expirar `audio/tmp/` en 1 día.
- [ ] Confirmar que ningún objeto usa ACL pública y que el acceso será solo por presigned URLs.

## Artefactos Generados
- `spaces-cors.json`

## Criterio de Salida
- [ ] Un PUT firmado local hacia MinIO funciona.
- [ ] Un delete del mismo objeto funciona.
- [ ] El bucket productivo queda con CORS válido para `https://${APP_DOMAIN}`.

## Siguiente Paso
Continuar con `Plan/03-audio-flow.md`.