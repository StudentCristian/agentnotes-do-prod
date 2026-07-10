export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import {
  assertSupportedAudioContentType,
  createBrowserAudioSpacesClient,
  createTemporaryAudioObjectKey,
} from '@/lib/audio/spaces-audio'
import { getSpacesBucket } from '@/lib/spaces'

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
})

function logUploadUrlEvent(event: string, details: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: 'audio-upload-url', event, ...details }))
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = uploadUrlSchema.parse(await request.json())
    assertSupportedAudioContentType(payload.contentType)

    logUploadUrlEvent('request_received', {
      userId,
      fileName: payload.fileName,
      contentType: payload.contentType,
    })

    const bucket = getSpacesBucket()
  const s3 = createBrowserAudioSpacesClient()
    const objectKey = createTemporaryAudioObjectKey(payload.fileName)

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: payload.contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })

    const signedUrl = new URL(uploadUrl)

    logUploadUrlEvent('signed_url_created', {
      bucket,
      objectKey,
      signedUrlOrigin: signedUrl.origin,
      signedUrlPath: signedUrl.pathname,
    })

    return NextResponse.json({ uploadUrl, objectKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate upload URL'

    console.error(
      JSON.stringify({
        scope: 'audio-upload-url',
        event: 'request_failed',
        error: message,
      })
    )

    return NextResponse.json({ error: message }, { status: 400 })
  }
}