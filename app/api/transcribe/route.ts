export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createTemporaryAudioReadUrl,
  createAudioSpacesClient,
  TEMP_AUDIO_PREFIX,
} from '@/lib/audio/spaces-audio'
import {
  transcribeConsultationWithBAML,
  validateBAMLEnvironment,
} from '@/lib/bamlClient'

const transcribeSchema = z.object({
  objectKey: z.string().min(1).startsWith(TEMP_AUDIO_PREFIX),
  fieldsSchema: z.string().min(1),
  contentType: z.string().min(1),
})

function logTranscribeEvent(event: string, details: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: 'audio-transcribe', event, ...details }))
}

/**
 * POST /api/transcribe
 *
 * Transcribes audio from object storage through a temporary signed URL and BAML.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    validateBAMLEnvironment()
    const payload = transcribeSchema.parse(await request.json())
    const s3 = createAudioSpacesClient()

    logTranscribeEvent('request_received', {
      objectKey: payload.objectKey,
      userId,
      contentType: payload.contentType,
      fieldsSchemaLength: payload.fieldsSchema.length,
    })

    const audioReadUrl = await createTemporaryAudioReadUrl(s3, payload.objectKey)
    const signedUrl = new URL(audioReadUrl)

    logTranscribeEvent('signed_url_created', {
      objectKey: payload.objectKey,
      signedUrlOrigin: signedUrl.origin,
      signedUrlPath: signedUrl.pathname,
    })

    logTranscribeEvent('baml_request_started', {
      objectKey: payload.objectKey,
    })

    const transcriptionResult = await transcribeConsultationWithBAML(
      audioReadUrl,
      payload.fieldsSchema,
      payload.contentType
    )

    logTranscribeEvent('baml_request_succeeded', {
      objectKey: payload.objectKey,
      transcriptLength: transcriptionResult.transcript_final.length,
      structuredFieldCount: Object.keys(transcriptionResult.structured_fields).length,
      warningCount: transcriptionResult.warnings.length,
      missingFieldCount: transcriptionResult.missing_fields.length,
      uncertainFieldCount: transcriptionResult.uncertain_fields.length,
    })

    return NextResponse.json(transcriptionResult)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred during transcription'

    console.error(
      JSON.stringify({
        scope: 'audio-transcribe',
        event: 'request_failed',
        error: errorMessage,
      })
    )

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with objectKey, fieldsSchema, and optional contentType to transcribe audio' },
    { status: 405 }
  )
}
