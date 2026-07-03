---
name: edgestore
description: Use when the user needs help with EdgeStore file uploads, buckets, adapters, providers, backend client usage, upload UI components, or troubleshooting. Covers setup and integration for Next.js, Astro, Express, Fastify, Hono, Remix, and TanStack Start, plus EdgeStore, AWS S3, Azure, and custom providers. Also applies to requests about protected buckets, file validation, upload progress, temporary files, error handling, and drag-and-drop upload components.
---

# EdgeStore Skill

Use this skill when the task involves integrating, configuring, debugging, or extending EdgeStore.

## What this skill covers

- Initial EdgeStore setup and environment variables
- Framework-specific adapters and API handlers
- Frontend provider setup with `createEdgeStoreProvider` and `useEdgeStore`
- Bucket configuration, validation, metadata, paths, hooks, and protected access
- Backend-side uploads, deletes, search/listing, and temporary file confirmation
- Upload UI components such as dropzones, progress indicators, and uploader state management
- Storage provider selection: default EdgeStore, AWS S3, Azure, or custom providers
- Error handling and troubleshooting

## Routing Instructions

Start by identifying the user's intent, then read only the smallest relevant reference set.

### 1. First-time setup or basic upload flow

Read [getting-started/quick-start.mdx](./getting-started/quick-start.mdx).

Use it for:

- package installation
- environment variables
- backend route or API handler setup
- frontend provider wiring
- upload, replace, delete, cancel, and temporary file flows

### 2. Bucket design and server-side rules

Read [getting-started/configuration.mdx](./getting-started/configuration.mdx).

Use it for:

- `fileBucket()` vs `imageBucket()`
- max file size and accepted mime types
- context creation and `reset()` behavior
- `input()`, `path()`, and `metadata()`
- `beforeUpload` and `beforeDelete`
- protected buckets and `accessControl`
- base path and parallel upload limits

Important implementation rules:

- If the user wants client-side deletion, make sure the bucket defines `beforeDelete`.
- If the task needs protected files, prefer the access-control pattern from the configuration guide.
- For protected images in Next.js, avoid `next/image`; use a normal `img` tag because cookies are not forwarded.

### 3. Backend-only operations

Read [getting-started/backend-client.mdx](./getting-started/backend-client.mdx).

Use it for:

- initializing `initEdgeStoreClient`
- backend uploads from text, blobs, or URLs
- confirming temporary uploads
- deleting files from the backend
- listing files with filters and pagination
- inferring backend client response types

### 4. Error diagnosis and support flows

Read these files in order:

1. [getting-started/error-handling.mdx](./getting-started/error-handling.mdx)
2. [getting-started/troubleshooting.mdx](./getting-started/troubleshooting.mdx)
3. [getting-started/logging.mdx](./getting-started/logging.mdx)

Use them for:

- typed client errors such as `FILE_TOO_LARGE`, `MIME_TYPE_NOT_ALLOWED`, `UPLOAD_NOT_ALLOWED`, and `DELETE_NOT_ALLOWED`
- aborted uploads
- `/health` endpoint verification
- increasing log level to `debug`
- browser console and network inspection

### 5. Framework-specific adapter setup

Choose the adapter file that matches the user's stack:

- Next.js: [adapters/next.mdx](./adapters/next.mdx)
- Astro: [adapters/astro.mdx](./adapters/astro.mdx)
- Express: [adapters/express.mdx](./adapters/express.mdx)
- Fastify: [adapters/fastify.mdx](./adapters/fastify.mdx)
- Hono: [adapters/hono.mdx](./adapters/hono.mdx)
- Remix: [adapters/remix.mdx](./adapters/remix.mdx)
- TanStack Start: [adapters/tanstack-start.mdx](./adapters/tanstack-start.mdx)

Each adapter guide typically includes:

- install steps
- environment variables
- backend wiring
- frontend wiring
- usage notes
- limitations where applicable

If the user says only "EdgeStore setup" and the framework is unclear, determine the framework from the repo before choosing an adapter.

### 6. Upload UI components and composable building blocks

Route by UI intent:

- drag and drop: [components/dropzone.mdx](./components/dropzone.mdx)
- uploader state and orchestration: [components/uploader-provider.mdx](./components/uploader-provider.mdx)
- single image upload UI: [components/image.mdx](./components/image.mdx)
- multiple images: [components/multi-image.mdx](./components/multi-image.mdx)
- multiple files: [components/multi-file.mdx](./components/multi-file.mdx)
- progress bar: [components/progress-bar.mdx](./components/progress-bar.mdx)
- progress circle: [components/progress-circle.mdx](./components/progress-circle.mdx)
- manual component installation: [components/manual-install.mdx](./components/manual-install.mdx)

Implementation guidance:

- Prefer `UploaderProvider` when the task needs multi-file state, progress, cancellation, retries, or shared upload orchestration.
- Use the dropzone docs when the user asks for drag-and-drop, file count limits, size validation, or better upload UX.
- If the project does not already include the expected utility helpers, check the manual install guide before adding components.

### 7. Storage provider selection

Read the provider that matches the requested storage target:

- default managed provider: [providers/edgestore.mdx](./providers/edgestore.mdx)
- AWS S3: [providers/aws.mdx](./providers/aws.mdx)
- Azure Blob Storage: [providers/azure.mdx](./providers/azure.mdx)
- custom provider work: [providers/custom.mdx](./providers/custom.mdx)

Provider rules:

- Default to the managed EdgeStore provider unless the user explicitly needs another storage backend.
- Keep access keys and secret keys in environment variables; never hardcode them.
- If the user asks for a provider not covered here, use the custom provider guide and model the implementation after the existing provider contract.

### 8. Small utilities

Read [getting-started/utils.mdx](./getting-started/utils.mdx) for helper functions such as download links and file-size formatting.

### 9. LLM-friendly documentation workflows

Read [getting-started/llms-vibe-coding.mdx](./getting-started/llms-vibe-coding.mdx) only when the task is specifically about consuming EdgeStore docs from LLM tooling or markdown exports.

## Recommended Workflow

1. Detect the framework and whether the user is working on backend wiring, frontend upload UX, provider selection, or debugging.
2. Read the matching reference files above, not the whole folder.
3. Preserve the user's framework conventions and existing router structure.
4. Keep secrets in env files and never commit them.
5. When writing code, use the bucket names and exported router types consistently across server and client.
6. If a flow involves replacing or deleting files, verify that the bucket configuration supports it.
7. If the issue is operational, validate the health endpoint and logs before changing code.

## Example Inputs

- "Configura EdgeStore en Next.js App Router"
- "Agrega subida múltiple con drag and drop usando EdgeStore"
- "Quiero usar S3 en vez del provider por defecto"
- "Necesito borrar archivos desde el cliente"
- "El upload falla con MIME type not allowed"
- "Quiero listar archivos desde el backend con filtros"

## Expected Outputs

- framework-specific setup that matches the user's stack
- bucket definitions with correct validation and hooks
- provider setup that keeps credentials in env vars
- frontend upload UI using the smallest fitting EdgeStore component pattern
- targeted debugging steps tied to actual EdgeStore error codes and health checks

## Common Edge Cases

- Next.js has separate adapter entry points for App Router and Pages Router.
- Protected buckets require access-control-aware usage and have special behavior in local development.
- Direct client deletion will fail without `beforeDelete`.
- Replacing a file can still appear stale briefly because of CDN cache.
- Temporary uploads may need explicit confirmation from backend flows.
- Some adapter guides include limitations; read them before changing framework-specific behavior.

