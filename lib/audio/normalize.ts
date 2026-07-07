import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { normalizeAudioContentType } from '@/lib/audio/spaces-audio'

const OUTPUT_SAMPLE_RATE = 16000

function getInputExtension(contentType?: string) {
  const mediaType = contentType ? normalizeAudioContentType(contentType) : ''

  switch (mediaType) {
    case 'audio/ogg':
      return 'ogg'
    case 'audio/wav':
    case 'audio/wave':
    case 'audio/x-wav':
      return 'wav'
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3'
    case 'audio/mp4':
    case 'audio/x-m4a':
      return 'm4a'
    case 'audio/webm':
    case 'video/webm':
    default:
      return 'webm'
  }
}

function ensureFfmpegPath() {
  if (!ffmpegPath) {
    throw new Error('FFmpeg binary is not available')
  }

  ffmpeg.setFfmpegPath(ffmpegPath)
}

function runFfmpeg(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-vn'])
      .audioChannels(1)
      .audioFrequency(OUTPUT_SAMPLE_RATE)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .save(outputPath)
  })
}

export async function normalizeAudioToWavPcmMono(input: Buffer, contentType?: string) {
  ensureFfmpegPath()

  const tempDir = await mkdtemp(path.join(tmpdir(), 'agentnotes-audio-'))
  const inputPath = path.join(tempDir, `${randomUUID()}.${getInputExtension(contentType)}`)
  const outputPath = path.join(tempDir, `${randomUUID()}.wav`)

  try {
    await writeFile(inputPath, input)
    await runFfmpeg(inputPath, outputPath)

    return await readFile(outputPath)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}