# Etapa 5: Producción

**Status**: TODO
**Prerequisites**: `Plan/04-cicd-secrets.md`

## Objetivo
Validar el dominio real, TLS automático, CORS final y el flujo extremo a extremo desde producción.

## Comandos
```bash
doctl apps logs $(doctl apps list --format ID,Spec.Name --no-header | awk '$2 == "agentnotes" { print $1 }') --type run
```

## Tareas
- [ ] Completar `${APP_DOMAIN}` con el dominio real en `.do/app.yaml` antes del deploy final.
- [ ] Confirmar resolución DNS y TLS automático en App Platform.
- [ ] Verificar CORS final con `https://${APP_DOMAIN}`.
- [ ] Ejecutar smoke tests con audio real `.webm` desde producción.
- [ ] Confirmar transcripción, estructuración, borrado del objeto y generación de documento.
- [ ] Revisar métricas básicas, logs de build y logs de runtime.

## Artefactos Generados
- Dominio productivo en DigitalOcean App Platform
- Configuración final de Spaces CORS

## Criterio de Salida
- [ ] `/api/health` responde `200` desde el dominio productivo.
- [ ] La secuencia grabación → transcripción → DOCX funciona desde producción.
- [ ] No quedan objetos temporales antiguos fuera de la lifecycle rule.

## Criterio de Cierre
AgentNotes queda desplegado en App Platform con PostgreSQL administrado, Spaces temporal, despliegues automáticos por rama y rollback operativo a través de GitHub Actions y `doctl`.