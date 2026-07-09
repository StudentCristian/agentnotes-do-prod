import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  getSpacesBucket,
  getSpacesCredentials,
  getSpacesEndpoint,
  getSpacesForcePathStyle,
  getSpacesRegion,
} from '@/lib/spaces'

export const TEMP_AUDIO_PREFIX = 'audio/tmp/'
export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024
export const TEMP_AUDIO_READ_URL_EXPIRY_SECONDS = 60 * 60

const SUPPORTED_AUDIO_EXTENSIONS = new Set(['webm', 'ogg', 'oga', 'wav', 'mp3', 'm4a'])
const SUPPORTED_AUDIO_MEDIA_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'video/webm',
])

export function createAudioSpacesClient(endpoint = getSpacesEndpoint()) {
  return new S3Client({
    endpoint,
    region: getSpacesRegion(),
    forcePathStyle: getSpacesForcePathStyle(),
    credentials: getSpacesCredentials(),
  })
}

export function normalizeAudioContentType(contentType: string) {
  return contentType.split(';')[0]?.trim().toLowerCase() ?? ''
}

export function assertSupportedAudioContentType(contentType: string) {
  const mediaType = normalizeAudioContentType(contentType)

  if (!SUPPORTED_AUDIO_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`Unsupported audio content type: ${contentType}`)
  }
}

export function createTemporaryAudioObjectKey(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'webm'
  const safeExtension = SUPPORTED_AUDIO_EXTENSIONS.has(extension) ? extension : 'webm'

  return `${TEMP_AUDIO_PREFIX}${randomUUID()}.${safeExtension}`
}

export function assertTemporaryAudioObjectKey(objectKey: string) {
  if (!objectKey.startsWith(TEMP_AUDIO_PREFIX)) {
    throw new Error('Invalid temporary audio object key')
  }
}

export async function getTemporaryAudioObject(s3: S3Client, objectKey: string) {
  assertTemporaryAudioObjectKey(objectKey)

  return s3.send(
    new GetObjectCommand({
      Bucket: getSpacesBucket(),
      Key: objectKey,
    })
  )
}

export async function createTemporaryAudioReadUrl(
  s3: S3Client,
  objectKey: string,
  expiresIn = TEMP_AUDIO_READ_URL_EXPIRY_SECONDS
) {
  assertTemporaryAudioObjectKey(objectKey)

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: getSpacesBucket(),
      Key: objectKey,
    }),
    { expiresIn }
  )
}

export async function deleteTemporaryAudioObject(s3: S3Client, objectKey: string) {
  assertTemporaryAudioObjectKey(objectKey)

  await s3.send(
    new DeleteObjectCommand({
      Bucket: getSpacesBucket(),
      Key: objectKey,
    })
  )
}