# Etapa 3: Flujo de Audio

**Status**: IN PROGRESS
**Prerequisites**: `Plan/02-spaces-setup.md`

## Objetivo
Migrar el pipeline de transcripción para usar upload directo del blob a Spaces o MinIO, retención temporal del objeto de audio privado y transcripción mediante BAML con URL firmada temporal de lectura sobre Spaces.

## Comandos
```bash
pnpm exec baml-cli generate --from baml_src
pnpm build
```

## Tareas
- [x] Crear `POST /api/audio/upload-url`.
- [x] Refactorizar `POST /api/transcribe` para `objectKey + fieldsSchema` con Zod.
- [x] Refactorizar `useTranscribe` para upload directo del blob.
- [x] Eliminar toda dependencia de Web Speech API del panel de audio sin tocar `pause()` ni `resume()`.
- [x] Cambiar la política de borrado a retención temporal con borrado manual.
- [x] Crear `POST /api/audio/delete` para borrar objetos temporales bajo `audio/tmp/`.
- [x] Generar URL firmada temporal de lectura para objetos privados en Spaces.
- [x] Usar BAML con `Audio.fromUrl(...)` y `send_url` para la transcripción.
- [x] Archivar Gemini Files API como flujo legado y fallback.
- [ ] Validar el flujo completo contra el bucket productivo y Gemini real.

## Artefactos Generados
- `baml_src/transcription.baml`
- `app/api/audio/upload-url/route.ts`
- `app/api/transcribe/route.ts`
- `lib/hooks/useTranscribe.ts`
- `components/audio/audio-bottom-bar.tsx`
- `app/api/audio/delete/route.ts`
- `lib/audio/spaces-audio.ts`
- `lib/bamlClient.ts`
- `lib/gemini-files-client.ts`
- `baml_src/clients.baml`

## Criterio de Salida
- [ ] El flujo completo funciona localmente contra MinIO/Spaces + BAML.
- [ ] El objeto temporal permanece tras transcribir y se borra solo por acción manual o lifecycle.

## Siguiente Paso
Continuar con `Plan/04-cicd-secrets.md`.