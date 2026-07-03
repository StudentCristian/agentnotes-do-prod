/**
 * BAML Client Configuration
 * 
 * Imports and configures the BAML client generated from baml_src files.
 * Uses Google Gemini for transcription and structuring.
 */

import { Audio } from '@boundaryml/baml'
import { b as bamlClient } from '../baml_client'
import { normalizeStructuredFields } from './consultation-fields'

/**
 * Validate that required environment variables are set
 */
export function validateBAMLEnvironment() {
  const requiredVars = ['GOOGLE_AI_API_KEY']
  const missing = requiredVars.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required BAML environment variables: ${missing.join(', ')}. ` +
      `Please set these in your .env.local file.`
    )
  }
}

export interface ConsultationOutput {
  transcript_final: string
  structured_fields: Record<string, string>
  warnings: string[]
  missing_fields: string[]
  uncertain_fields: string[]
}

/**
 * Get the BAML client for making requests
 */
export function getBAMLClient() {
  validateBAMLEnvironment()
  return bamlClient
}

function normalizeAudioMediaType(contentType?: string) {
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase()

  if (!mediaType) {
    return undefined
  }

  // Some browser/recorder combinations label audio-only WebM as video/webm.
  if (mediaType === 'video/webm') {
    return 'audio/webm'
  }

  if (mediaType === 'audio/wav' || mediaType === 'audio/wave') {
    return 'audio/x-wav'
  }

  if (mediaType === 'audio/mp3') {
    return 'audio/mpeg'
  }

  return mediaType
}

export async function transcribeConsultationWithBAML(
  audioBase64: string,
  fieldsSchema: string,
  contentType?: string
) {
  const client = getBAMLClient()
  const mediaType = normalizeAudioMediaType(contentType) ?? 'audio/webm'
  const result = await client.TranscribeConsultation(
    Audio.fromBase64(mediaType, audioBase64),
    fieldsSchema
  )

  return {
    ...result,
    structured_fields: normalizeStructuredFields(result.structured_fields),
  } satisfies ConsultationOutput
}
