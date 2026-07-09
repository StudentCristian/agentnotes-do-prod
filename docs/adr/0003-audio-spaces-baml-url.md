# ADR-0003: Audio Spaces BAML URL

**Status:** Accepted  
**Date:** 2026-07-08

## Context

The current audio pipeline stores temporary recordings in DigitalOcean Spaces, normalizes the audio on the backend, uploads the normalized file to Gemini Files API, and then calls Gemini directly to produce the final structured transcription. That implementation works, but it bypasses BAML for the audio pipeline and leaves two separate transcription patterns in the codebase: the legacy BAML base64 path and the newer Gemini Files API path.

We want a single transcription path that keeps the existing Spaces-based capture and temporary storage model, but moves the final transcription and structured output back into BAML. The target is to use a signed temporary URL for the audio object and let BAML consume it through `Audio.from_url(...)`, while keeping Spaces private and temporary.

## Decision

We will migrate the audio transcription pipeline to BAML using signed Spaces URLs.

The new flow is:

1. The client uploads audio to DigitalOcean Spaces as it does today.
2. The backend generates a temporary signed read URL for the uploaded object.
3. The backend passes that URL to BAML using `Audio.from_url(...)`.
4. BAML performs the transcription and structured output generation.
5. The backend returns the structured transcript response to the client.

The current Gemini Files API implementation will be archived as the previous implementation and will no longer be the primary audio transcription path.

## Rationale

BAML is better suited for the final structured output of the consultation transcript because it provides a typed contract for the generated response and keeps the transcription prompt, schema, and output shape in one place. Using `Audio.from_url(...)` also avoids sending base64 audio through the application stack when the audio already exists in object storage.

Spaces already provides a good temporary-storage model for audio recordings, and presigned URLs are the right mechanism for granting short-lived read access to private objects. This keeps the bucket private while still allowing the model provider to access the file during transcription.

## Consequences

### Positive

- The audio transcription path becomes consistent and centralized in BAML.
- The structured output contract remains close to the transcription prompt and schema.
- The backend no longer needs to upload audio to Gemini Files API.
- Temporary private storage in Spaces remains the source of truth for audio objects.

### Negative

- The pipeline now depends on signed URL accessibility for the provider.
- If the signed URL cannot be read reliably by the provider, transcription will fail.
- The implementation must handle URL expiration carefully.

## Requirements

To support this ADR, the codebase must:

- Add a backend endpoint to generate a signed read URL for a Spaces object.
- Update the BAML audio client to use `Audio.from_url(...)`.
- Configure the Google AI BAML provider to preserve audio URLs with `send_url`.
- Keep the object storage bucket private.
- Maintain the existing manual deletion flow and 24-hour lifecycle policy.

## Constraints

This migration is valid only if the signed Spaces URL can be exposed in a way that is compatible and reliable for the selected provider. If provider access to the URL is unstable or unsupported in practice, the team should fall back to the archived Gemini Files API implementation.

## Migration Plan

1. Implement a signed read URL endpoint for temporary audio objects.
2. Update the BAML transcription function to accept audio via URL.
3. Adjust the BAML Google AI client configuration to use `send_url`.
4. Replace the current Gemini Files API transcription path with the BAML-based path.
5. Archive the previous implementation in the repository as the legacy audio transcription flow.
6. Validate transcription, structured output, and deletion behavior end to end.

## Status of Previous Implementation

The current Gemini Files API-based implementation is archived as the previous version of the audio pipeline. It remains available for reference and fallback evaluation, but it is no longer the active transcription path once this ADR is implemented.

## Notes

This ADR intentionally preserves the current audio upload and temporary storage behavior. The only architectural change is the transcription mechanism and the way the model receives the audio input.