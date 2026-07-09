export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  assertSupportedAudioContentType,
  createAudioSpacesClient,
  createTemporaryAudioObjectKey,
  MAX_AUDIO_UPLOAD_BYTES,
  putTemporaryAudioObject,
} from '@/lib/audio/spaces-audio'

const uploadAudioHeadersSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
})

function logUploadEvent(event: string, details: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: 'audio-upload', event, ...details }))
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = uploadAudioHeadersSchema.parse({
      fileName: request.headers.get('x-file-name') ?? '',
      contentType: request.headers.get('content-type') ?? '',
    })

    assertSupportedAudioContentType(payload.contentType)

    const audioBytes = Buffer.from(await request.arrayBuffer())

    if (audioBytes.byteLength === 0) {
      throw new Error('Uploaded audio body is empty')
    }

    if (audioBytes.byteLength > MAX_AUDIO_UPLOAD_BYTES) {
      throw new Error(`Uploaded audio exceeds ${MAX_AUDIO_UPLOAD_BYTES} bytes`) 
    }

    const objectKey = createTemporaryAudioObjectKey(payload.fileName)
    const s3 = createAudioSpacesClient()

    logUploadEvent('fallback_upload_started', {
      userId,
      objectKey,
      contentType: payload.contentType,
      byteLength: audioBytes.byteLength,
    })

    await putTemporaryAudioObject(s3, objectKey, audioBytes, payload.contentType)

    logUploadEvent('fallback_upload_succeeded', {
      objectKey,
      contentType: payload.contentType,
      byteLength: audioBytes.byteLength,
    })

    return NextResponse.json({ objectKey, uploadedVia: 'server-fallback' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload audio object'

    console.error(
      JSON.stringify({
        scope: 'audio-upload',
        event: 'fallback_upload_failed',
        error: message,
      })
    )

    return NextResponse.json({ error: message }, { status: 400 })
  }
}