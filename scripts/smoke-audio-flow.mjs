#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'

const FIELD_SCHEMA = [
  'motivo_consulta: Motivo de Consulta',
  'enfermedad_actual: Enfermedad Actual',
  'estado_general: Estado General',
  'diagnosticos: Diagnosticos',
  'conducta: Conducta / Plan de Tratamiento',
  'medicamentos: Medicamentos',
].join('\n')

function parseArgs(argv) {
  const args = { baseUrl: 'http://127.0.0.1:3000', audioPath: null }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--base-url') {
      args.baseUrl = argv[index + 1] ?? args.baseUrl
      index += 1
      continue
    }

    if (value === '--audio') {
      args.audioPath = argv[index + 1] ?? null
      index += 1
    }
  }

  return args
}

function getEnv(name, fallback) {
  const value = process.env[name] ?? fallback

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/$/, '')
}

function getHostVisibleEndpoint() {
  return normalizeEndpoint(getEnv('SMOKE_S3_ENDPOINT', process.env.DO_SPACES_ENDPOINT))
}

function getS3Client() {
  return new S3Client({
    endpoint: getHostVisibleEndpoint(),
    region: getEnv('DO_SPACES_REGION'),
    forcePathStyle: false,
    credentials: {
      accessKeyId: getEnv('DO_SPACES_KEY'),
      secretAccessKey: getEnv('DO_SPACES_SECRET'),
    },
  })
}

function createSilentWavBuffer({ durationSeconds = 1, sampleRate = 16000 } = {}) {
  const channelCount = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const sampleCount = durationSeconds * sampleRate
  const dataSize = sampleCount * channelCount * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channelCount, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28)
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  return buffer
}

async function resolveAudioInput(audioPath) {
  if (audioPath) {
    const absolutePath = path.resolve(audioPath)
    const body = await readFile(absolutePath)
    return {
      cleanup: async () => {},
      fileName: path.basename(absolutePath),
      contentType: 'audio/wav',
      body,
    }
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), 'agentnotes-smoke-'))
  const tempPath = path.join(tempDir, `${randomUUID()}.wav`)
  const body = createSilentWavBuffer()
  await writeFile(tempPath, body)

  return {
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true })
    },
    fileName: path.basename(tempPath),
    contentType: 'audio/wav',
    body,
  }
}

async function assertObjectExists(s3, bucket, objectKey) {
  await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    })
  )
}

async function assertObjectDeleted(s3, bucket, objectKey) {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('NotFound') || message.includes('UnknownError')) {
      return
    }

    throw error
  }

  throw new Error(`Temporary object still exists after transcription: ${objectKey}`)
}

async function main() {
  const { baseUrl, audioPath } = parseArgs(process.argv.slice(2))
  const audio = await resolveAudioInput(audioPath)
  const bucket = getEnv('DO_SPACES_BUCKET', 'agentnotes-audio-prod')
  const s3 = getS3Client()

  try {
    console.log(`[smoke] requesting upload URL from ${baseUrl}`)
    const uploadResponse = await fetch(`${baseUrl}/api/audio/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: audio.fileName,
        contentType: audio.contentType,
      }),
    })

    const uploadPayload = await uploadResponse.json()

    if (!uploadResponse.ok) {
      throw new Error(`upload-url failed: ${JSON.stringify(uploadPayload)}`)
    }

    console.log(`[smoke] uploading ${audio.fileName} to temporary object ${uploadPayload.objectKey}`)
    const putResponse = await fetch(uploadPayload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': audio.contentType },
      body: audio.body,
    })

    if (!putResponse.ok) {
      throw new Error(`PUT upload failed with status ${putResponse.status}`)
    }

    await assertObjectExists(s3, bucket, uploadPayload.objectKey)
    console.log('[smoke] temporary object upload verified')

    console.log('[smoke] calling /api/transcribe (BAML via signed Spaces URL)')
    const transcribeResponse = await fetch(`${baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey: uploadPayload.objectKey,
        fieldsSchema: FIELD_SCHEMA,
        contentType: audio.contentType,
      }),
    })

    const transcribePayload = await transcribeResponse.json()

    await assertObjectExists(s3, bucket, uploadPayload.objectKey)
    console.log('[smoke] temporary object retained after transcription')

    if (!transcribeResponse.ok) {
      throw new Error(`transcribe failed: ${JSON.stringify(transcribePayload)}`)
    }

    if (typeof transcribePayload.transcript_final !== 'string') {
      throw new Error('transcribe returned an invalid transcript payload')
    }

    if (typeof transcribePayload.structured_fields !== 'object' || !transcribePayload.structured_fields) {
      throw new Error('transcribe returned invalid structured fields')
    }

    console.log('[smoke] deleting temporary object through /api/audio/delete')
    const deleteResponse = await fetch(`${baseUrl}/api/audio/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey: uploadPayload.objectKey,
      }),
    })

    const deletePayload = await deleteResponse.json()

    if (!deleteResponse.ok) {
      throw new Error(`delete failed: ${JSON.stringify(deletePayload)}`)
    }

    await assertObjectDeleted(s3, bucket, uploadPayload.objectKey)
    console.log('[smoke] temporary object manual deletion verified')

    console.log('[smoke] BAML transcription succeeded')
    console.log(JSON.stringify({
      transcript_final: transcribePayload.transcript_final,
      missing_fields: transcribePayload.missing_fields,
      warnings: transcribePayload.warnings,
    }, null, 2))
  } finally {
    await audio.cleanup()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error(`[smoke] ${message}`)
  process.exitCode = 1
})
