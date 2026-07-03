# Etapa 3: Flujo de Audio

**Status**: TODO
**Prerequisites**: `Plan/02-spaces-setup.md`

## Objetivo
Migrar el pipeline de transcripción para usar upload directo del blob a Spaces o MinIO, URL firmada de lectura y una única llamada BAML multimodal.

## Comandos
```bash
pnpm exec baml-cli generate --from baml_src
pnpm build
```

## Tareas
- [ ] Reemplazar `TranscribeAudio(audio_text)` por `TranscribeConsultation(audio, fields_schema)`.
- [ ] Crear `POST /api/audio/upload-url`.
- [ ] Refactorizar `POST /api/transcribe` para `objectKey + fieldsSchema` con Zod.
- [ ] Refactorizar `useTranscribe` para upload directo del blob.
- [ ] Eliminar toda dependencia de Web Speech API del panel de audio sin tocar `pause()` ni `resume()`.

## Artefactos Generados
- `baml_src/transcription.baml`
- `app/api/audio/upload-url/route.ts`
- `app/api/transcribe/route.ts`
- `lib/hooks/useTranscribe.ts`
- `components/audio/audio-bottom-bar.tsx`

## Criterio de Salida
- [ ] El flujo completo funciona localmente contra MinIO + Gemini.
- [ ] El objeto temporal se borra en `finally`.

## Siguiente Paso
Continuar con `Plan/04-cicd-secrets.md`.