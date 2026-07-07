export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createAudioSpacesClient,
  deleteTemporaryAudioObject,
  TEMP_AUDIO_PREFIX,
} from '@/lib/audio/spaces-audio'

const deleteAudioSchema = z.object({
  objectKey: z.string().min(1).startsWith(TEMP_AUDIO_PREFIX),
})

async function deleteAudioObject(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = deleteAudioSchema.parse(await request.json())
    const s3 = createAudioSpacesClient()

    await deleteTemporaryAudioObject(s3, payload.objectKey)

    return NextResponse.json({ deleted: true, objectKey: payload.objectKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete audio object'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  return deleteAudioObject(request)
}

export async function DELETE(request: NextRequest) {
  return deleteAudioObject(request)
}