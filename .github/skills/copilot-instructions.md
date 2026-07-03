# AgentNotes — GitHub Copilot Instructions

## Project Overview

AgentNotes is a Next.js 16 web application that helps healthcare professionals record, transcribe, and structure clinical consultations using AI. The user speaks or dictates during or after a consultation; the app captures the audio, sends it to Gemini via BAML, and returns structured clinical fields ready to review, edit, and export as a document.

The application is designed to be specialty-agnostic: any professional who needs to convert spoken clinical notes into structured records can use it — general practitioners, specialists, nurses, psychologists, or any other healthcare role.

***

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5, strict mode |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Animation | Motion (Framer Motion v12) |
| AI / LLM | BAML `@boundaryml/baml` 0.222 + Gemini via `GoogleGeminiClient` |
| Document generation | docxtemplater + pizzip |
| File uploads (legacy) | @edgestore/react + @edgestore/server (being replaced — see Audio Flow) |
| Package manager | pnpm (workspace) |
| Infrastructure | DigitalOcean App Platform, Spaces Object Storage, Managed PostgreSQL |
| CI/CD | GitHub Actions → `digitalocean/app_action/deploy@v2` |

***

## Repository Structure

```
AgentNote/
├── app/
│   ├── (dashboard)/          # Route group: authenticated dashboard shell
│   ├── dashboard/            # Dashboard pages
│   ├── api/                  # Next.js API routes (server-side only)
│   ├── layout.tsx
│   └── page.tsx
├── baml_src/                 # BAML source files (edit here, not baml_client/)
│   ├── clients.baml          # Gemini client definition
│   └── transcription.baml   # TranscribeConsultation function
├── baml_client/              # Auto-generated — NEVER edit manually
├── components/
│   ├── audio/                # Audio recording components
│   │   └── audio-bottom-bar.tsx
│   └── ui/                   # shadcn/ui components
├── lib/
│   └── hooks/                # Custom React hooks
├── public/
├── .do/                      # DigitalOcean App Platform spec (app.yaml)
├── .github/
│   ├── skills/               # DO App Platform skills (do-app-platform-skills)
│   └── workflows/            # GitHub Actions CI/CD
└── Plan/                     # Staged implementation plans
```

***

## Architecture Decisions

### Audio Flow (current → target)

**Current state (v1 legacy):** `audio-bottom-bar.tsx` used Web Speech API to capture live text while recording, then sent that text string to the BAML function. This caused failures when the browser lacked speech recognition support.

**Target state (v1 new):** Web Speech API is fully removed. The audio `Blob` is uploaded directly to DigitalOcean Spaces via a presigned PUT URL; the backend generates a presigned GET URL and passes it to BAML as `Audio.from_url(url)`. Gemini processes the audio directly.

```
Frontend                    Backend (API routes)         DO Spaces           Gemini/BAML
   |                               |                          |                    |
   |-- POST /api/audio/upload-url->|                          |                    |
   |<-- { uploadUrl, objectKey } --|                          |                    |
   |                               |                          |                    |
   |-- PUT audioBlob (webm) --------------------------------->|                    |
   |<-- 200 OK ------------------------------------------------|                    |
   |                               |                          |                    |
   |-- POST /api/transcribe ------->|                          |                    |
   |   { objectKey, fieldsSchema } |-- presigned GET URL ---->|                    |
   |                               |<-- url ------------------|                    |
   |                               |                                               |
   |                               |-- BAML TranscribeConsultation(audio, schema)->|
   |                               |<-- ConsultationOutput ------------------------|
   |                               |                          |                    |
   |                               |-- DELETE objectKey ------>|                    |
   |<-- ConsultationOutput ---------|
```

**Key constraints:**
- Never use base64 for audio — always `Audio.from_url(presignedGetUrl)`
- Audio files are stored under prefix `audio/tmp/` in the Spaces bucket
- Explicit deletion happens after BAML call in a `finally` block
- Lifecycle rule on Spaces: objects under `audio/tmp/` expire after 1 day (fallback)
- Presigned PUT URL expires in 5 minutes; presigned GET URL expires in 1 hour

### BAML: One Function, One Call

The entire pipeline — transcription + clinical field extraction + warnings — is handled by a **single BAML function call**: `TranscribeConsultation`. Do not split into multiple chained BAML calls. Do not send text intermediates to a second function.

Current function in `baml_src/transcription.baml` uses a string input `TranscribeAudio(audio_text: string)`. This is being replaced with `TranscribeConsultation(audio: audio, fields_schema: string) -> ConsultationOutput`.

### Pause and Resume During Recording

`MediaRecorder.pause()` and `MediaRecorder.resume()` preserve all previously recorded chunks. The `ondataavailable` handler pushes every chunk into `audioChunksRef.current` regardless of pauses. At stop, all chunks are merged into a single `Blob`. This behavior is correct and must not be changed.

### Environments

| Environment | Purpose | Branch |
|---|---|---|
| `development` | Local iteration, no DO services required | feature/* |
| `staging` | Integration testing with real DO services | staging |
| `production` | Stable, clinic-ready | main |

Subdomains: `app.{domain}` for production, `staging.{domain}` for staging.

***

## BAML Rules

- All BAML source lives in `baml_src/`. The `baml_client/` directory is auto-generated by `npx baml-cli generate` — never edit it.
- The Gemini client is defined in `baml_src/clients.baml` as `GoogleGeminiClient`. Do not create alternative clients unless explicitly asked.
- Audio inputs must use the `audio` BAML type and `Audio.from_url(url)` in TypeScript.
- Output types must be defined as BAML `class` blocks before the function.
- After changing any `.baml` file, run `npx baml-cli generate` to regenerate `baml_client/`.

```baml
// Target function shape — baml_src/transcription.baml
class ConsultationOutput {
  transcript_final   string
  structured_fields  map<string, string>
  warnings           string[]
  missing_fields     string[]
  uncertain_fields   string[]
}

function TranscribeConsultation(audio: audio, fields_schema: string) -> ConsultationOutput {
  client GoogleGeminiClient
  prompt #"
    ...
    {{ audio }}
    {{ ctx.output_format }}
  "#
}
```

***

## API Routes

All API routes live under `app/api/`. They are server-only — never import them from client components.

| Route | Method | Purpose |
|---|---|---|
| `/api/audio/upload-url` | POST | Returns presigned PUT URL + objectKey for direct Spaces upload |
| `/api/transcribe` | POST | Receives objectKey + fieldsSchema, calls BAML, deletes audio, returns ConsultationOutput |

The S3 client for Spaces uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` pointed at the DO Spaces endpoint. It is instantiated once per route file — do not create a global singleton across routes.

```ts
// Standard S3 client pattern for DO Spaces
const s3 = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
})
```

***

## Environment Variables

| Variable | Used In | Source |
|---|---|---|
| `DO_SPACES_KEY` | `/api/audio/upload-url`, `/api/transcribe` | GitHub Secrets → App Platform env |
| `DO_SPACES_SECRET` | Same | GitHub Secrets → App Platform env |
| `DO_SPACES_BUCKET` | Same | GitHub Secrets → App Platform env |
| `DO_SPACES_REGION` | Same | GitHub Secrets → App Platform env |
| `DATABASE_URL` | DB client | DO Managed DB bindable variable |
| `GOOGLE_AI_API_KEY` | BAML client | GitHub Secrets → App Platform env |

Never hardcode credentials. Never commit `.env` with real values. Use `.env.local` locally (already in `.gitignore`).

***

## Component Conventions

### `audio-bottom-bar.tsx`

This is the main recording component. It manages these states: `idle`, `loading`, `recording`, `paused`, `recorded`, `playing`, `transcribing`.

When modifying this component:
- Do not reintroduce Web Speech API (`SpeechRecognition`, `webkitSpeechRecognition`)
- Do not remove `audioChunksRef` — it is the source of truth for the audio blob
- `pauseRecording` calls `mediaRecorderRef.current.pause()` — this is intentional and correct
- `resumeRecording` calls `mediaRecorderRef.current.resume()` — chunks are not lost
- `handleTranscription` must call `transcribeAudio(blob)` not `transcribeAudio(text)`
- The upload to Spaces happens inside `useTranscribe` or a dedicated hook — not inline in the component

### General component rules
- Use `"use client"` only when the component uses browser APIs or React state/effects
- Prefer `useCallback` for event handlers passed as props
- Use `useRef` for values that should not trigger re-renders (media recorder, audio element, chunks)
- shadcn/ui components live in `components/ui/` — do not modify them directly; extend via composition

***

## Styling

- Tailwind CSS v4 — utility-first, no custom CSS unless strictly necessary
- Dark mode via `next-themes` with class strategy
- Use `cn()` from `lib/utils` for conditional class merging
- Do not use inline `style` props for layout or spacing — use Tailwind classes

***

## Code Quality Rules

- TypeScript strict mode — no `any`, no `@ts-ignore` without justification comment
- No `console.log` in production paths — use `console.error` only for caught errors
- All async functions must have explicit error handling (`try/catch` or `.catch()`)
- API route handlers must return typed `Response.json()` with appropriate HTTP status codes
- Zod is available for runtime validation of API inputs — use it for all POST body parsing

***

## DigitalOcean Infrastructure

### App Platform
- App spec lives in `.do/app.yaml`
- Build command: `pnpm install && pnpm build`
- Run command: `pnpm start`
- Node version: 20

### Spaces Object Storage
- Bucket: `agentnotes-audio-tmp` (or as configured)
- All audio objects under prefix `audio/tmp/`
- No public ACL — presigned URLs only
- CORS: allow PUT from app domain only
- Lifecycle: expire `audio/tmp/` prefix after 1 day

### Managed PostgreSQL
- Connection via `DATABASE_URL` bindable variable from App Platform
- Do not use connection pooling at the app level for v1 — DO Managed DB handles it
- Schema migrations tracked in `db/migrations/` (to be created)

### Domains
- Registered and managed in DigitalOcean Domains
- HTTPS certificate managed automatically by App Platform
- Do not configure DNS manually outside DO

***

## What NOT to Do

- Do not use `base64` encoding for audio data at any point
- Do not call multiple BAML functions in sequence for the same consultation
- Do not reintroduce Web Speech API (`SpeechRecognition`, `webkitSpeechRecognition`, `capturedTranscript`)
- Do not edit files inside `baml_client/` — they are auto-generated
- Do not store audio permanently — every file must be deleted after processing
- Do not expose `DO_SPACES_KEY`, `DO_SPACES_SECRET`, or `GOOGLE_AI_API_KEY` in client-side code
- Do not use `@edgestore` for audio uploads — it is being replaced by the Spaces presigned URL flow
- Do not add new environment variables without documenting them here and in `.env.example`

***

## Skills Available (DigitalOcean App Platform)

Skills are installed at `.github/skills/app-platform-skills/`. When working on infrastructure tasks, reference the appropriate sub-skill:

| Task | Skill |
|---|---|
| Local dev environment | `devcontainers` |
| App spec design | `designer` |
| PostgreSQL setup | `postgres` |
| Spaces configuration | `spaces` |
| Domain + HTTPS | `networking` |
| Staged plan | `planner` |
| GitHub Actions deploy | `deployment` |