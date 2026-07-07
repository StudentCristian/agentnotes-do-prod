export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import {
  assertSupportedAudioContentType,
  createAudioSpacesClient,
  createTemporaryAudioObjectKey,
} from '@/lib/audio/spaces-audio'
import {
  getSpacesBucket,
  getSpacesPublicEndpoint,
} from '@/lib/spaces'

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = uploadUrlSchema.parse(await request.json())
    assertSupportedAudioContentType(payload.contentType)

    const bucket = getSpacesBucket()
    const endpoint = getSpacesPublicEndpoint()
    const s3 = createAudioSpacesClient(endpoint)
    const objectKey = createTemporaryAudioObjectKey(payload.fileName)

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: payload.contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })

    return NextResponse.json({ uploadUrl, objectKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate upload URL'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}