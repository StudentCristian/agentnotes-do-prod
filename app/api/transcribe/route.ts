export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  validateBAMLEnvironment, 
  transcribeConsultationWithBAML,
  type ConsultationOutput,
} from '@/lib/bamlClient'
import {
  getSpacesBucket,
  getSpacesCredentials,
  getSpacesEndpoint,
  getSpacesForcePathStyle,
  getSpacesRegion,
} from '@/lib/spaces'

const transcribeSchema = z.object({
  objectKey: z.string().min(1),
  fieldsSchema: z.string().min(1),
  contentType: z.string().min(1).optional(),
})

function createS3Client() {
  return new S3Client({
    endpoint: getSpacesEndpoint(),
    region: getSpacesRegion(),
    forcePathStyle: getSpacesForcePathStyle(),
    credentials: getSpacesCredentials(),
  })
}

/**
 * POST /api/transcribe
 * 
 * Transcribes audio from object storage and structures the output using BAML + Google Gemini.
 */
export async function POST(request: NextRequest) {
  let objectKey: string | null = null

  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    validateBAMLEnvironment()
    const payload = transcribeSchema.parse(await request.json())
    const s3 = createS3Client()
    objectKey = payload.objectKey

    const objectResponse = await s3.send(
      new GetObjectCommand({
        Bucket: getSpacesBucket(),
        Key: payload.objectKey,
      })
    )

    if (!objectResponse.Body) {
      throw new Error('Uploaded audio object is empty')
    }

    const audioBytes = await objectResponse.Body.transformToByteArray()
    const audioBase64 = Buffer.from(audioBytes).toString('base64')
    const mediaType = payload.contentType ?? objectResponse.ContentType

    const transcriptionResult: ConsultationOutput = await transcribeConsultationWithBAML(
      audioBase64,
      payload.fieldsSchema,
      mediaType
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
    if (objectKey) {
      try {
        const s3 = createS3Client()
        await s3.send(
          new DeleteObjectCommand({
            Bucket: getSpacesBucket(),
            Key: objectKey,
          })
        )
      } catch (error) {
        console.error('[Transcribe] Failed to delete temporary audio object:', error)
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
