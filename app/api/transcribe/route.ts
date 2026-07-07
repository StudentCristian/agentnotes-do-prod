export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createAudioSpacesClient,
  getTemporaryAudioObject,
  TEMP_AUDIO_PREFIX,
} from '@/lib/audio/spaces-audio'
import { normalizeAudioToWavPcmMono } from '@/lib/audio/normalize'
import {
  deleteGeminiFile,
  transcribeConsultationWithGeminiFile,
  uploadAudioToGeminiFile,
  validateGeminiFilesEnvironment,
} from '@/lib/gemini-files-client'

const transcribeSchema = z.object({
  objectKey: z.string().min(1).startsWith(TEMP_AUDIO_PREFIX),
  fieldsSchema: z.string().min(1),
  contentType: z.string().min(1).optional(),
})

/**
 * POST /api/transcribe
 * 
 * Transcribes audio from object storage through WAV normalization and Gemini Files API.
 */
export async function POST(request: NextRequest) {
  let geminiFileName: string | null = null

  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    validateGeminiFilesEnvironment()
    const payload = transcribeSchema.parse(await request.json())
    const s3 = createAudioSpacesClient()

    const objectResponse = await getTemporaryAudioObject(s3, payload.objectKey)

    if (!objectResponse.Body) {
      throw new Error('Uploaded audio object is empty')
    }

    const mediaType = payload.contentType ?? objectResponse.ContentType
    const audioBytes = Buffer.from(await objectResponse.Body.transformToByteArray())
    const normalizedAudio = await normalizeAudioToWavPcmMono(audioBytes, mediaType)
    const geminiFile = await uploadAudioToGeminiFile(normalizedAudio, 'audio/wav')
    geminiFileName = geminiFile.name

    const transcriptionResult = await transcribeConsultationWithGeminiFile(
      geminiFile.uri,
      payload.fieldsSchema,
      'audio/wav'
    )

    return NextResponse.json(transcriptionResult)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred during transcription'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  } finally {
    if (geminiFileName) {
      try {
        await deleteGeminiFile(geminiFileName)
      } catch (error) {
        console.error('[Transcribe] Failed to delete Gemini temporary audio file:', error)
      }
    }
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method with objectKey, fieldsSchema, and optional contentType to transcribe audio' },
    { status: 405 }
  )
}
