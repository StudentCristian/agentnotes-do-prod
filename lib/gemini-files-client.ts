import { normalizeStructuredFields } from '@/lib/consultation-fields'
import type { ConsultationOutput } from '@/lib/bamlClient'

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_UPLOAD_BASE_URL = 'https://generativelanguage.googleapis.com/upload/v1beta'
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

type ApiKey = string
type FileName = string
type FileUri = string
type FieldsSchema = string
type MimeType = string
type UploadUrl = string

type GeminiFile = {
  name: string
  uri: string
  mimeType?: string
}

type GeminiUploadResponse = {
  file?: GeminiFile
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

const EMPTY_LIST: string[] = []

function getGoogleAiApiKey() {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error('Missing required environment variable: GOOGLE_AI_API_KEY')
  }

  return apiKey
}

function getGeminiModel() {
  return process.env.GEMINI_TRANSCRIPTION_MODEL || DEFAULT_GEMINI_MODEL
}

async function parseErrorResponse(response: Response) {
  const body = await response.text().catch(() => '')
  return body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`
}

async function assertOkResponse(response: Response, message: string) {
  if (!response.ok) {
    throw new Error(`${message}: ${await parseErrorResponse(response)}`)
  }
}

function parseConsultationOutput(text: string) {
  const jsonText = stripJsonFence(text)
  const parsed = JSON.parse(jsonText) as ConsultationOutput

  return {
    transcript_final: parsed.transcript_final ?? '',
    structured_fields: normalizeStructuredFields(parsed.structured_fields ?? {}),
    warnings: toStringList(parsed.warnings),
    missing_fields: toStringList(parsed.missing_fields),
    uncertain_fields: toStringList(parsed.uncertain_fields),
  } satisfies ConsultationOutput
}

function stripJsonFence(text: string) {
  const trimmed = text.trim()

  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
}

function toStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : EMPTY_LIST
}

function buildTranscriptionPrompt(fieldsSchema: FieldsSchema) {
  return [
    'You are processing a clinical consultation audio recording.',
    'Transcribe completely and extract structured fields.',
    '',
    `Fields to extract:\n${fieldsSchema}`,
    '',
    'Return only valid JSON with this exact shape:',
    '{',
    '  "transcript_final": "Full verbatim transcription",',
    '  "structured_fields": { "field_name": "value" },',
    '  "warnings": [],',
    '  "missing_fields": [],',
    '  "uncertain_fields": []',
    '}',
  ].join('\n')
}

export function validateGeminiFilesEnvironment() {
  getGoogleAiApiKey()
}

async function startGeminiFileUpload(apiKey: ApiKey, audio: Buffer, mimeType: MimeType) {
  const response = await fetch(`${GEMINI_UPLOAD_BASE_URL}/files?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(audio.byteLength),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: JSON.stringify({
      file: {
        display_name: `agentnotes-${Date.now()}.wav`,
      },
    }),
  })

  await assertOkResponse(response, 'Gemini file upload initialization failed')

  const uploadUrl = response.headers.get('x-goog-upload-url')

  if (!uploadUrl) {
    throw new Error('Gemini file upload URL was not returned')
  }

  return uploadUrl
}

async function finalizeGeminiFileUpload(uploadUrl: UploadUrl, audio: Buffer, mimeType: MimeType) {
  const uploadBody = new Blob([new Uint8Array(audio)], { type: mimeType })
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(audio.byteLength),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: uploadBody,
  })

  await assertOkResponse(uploadResponse, 'Gemini file upload failed')

  const uploadPayload = (await uploadResponse.json()) as GeminiUploadResponse
  return assertGeminiFile(uploadPayload.file)
}

function assertGeminiFile(file: GeminiFile | undefined) {
  if (file?.uri && file.name) {
    return file
  }

  throw new Error('Gemini file upload response did not include file uri')
}

export async function uploadAudioToGeminiFile(audio: Buffer, mimeType: MimeType) {
  const apiKey = getGoogleAiApiKey()
  const uploadUrl = await startGeminiFileUpload(apiKey, audio, mimeType)

  return finalizeGeminiFileUpload(uploadUrl, audio, mimeType)
}

function buildGenerateContentBody(fileUri: FileUri, fieldsSchema: FieldsSchema, mimeType: MimeType) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            file_data: {
              mime_type: mimeType,
              file_uri: fileUri,
            },
          },
          {
            text: buildTranscriptionPrompt(fieldsSchema),
          },
        ],
      },
    ],
    generation_config: {
      response_mime_type: 'application/json',
    },
  }
}

function extractTextOutput(payload: GeminiGenerateContentResponse) {
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text

  if (!text) {
    throw new Error('Gemini transcription response did not include text output')
  }

  return text
}

export async function transcribeConsultationWithGeminiFile(
  fileUri: FileUri,
  fieldsSchema: FieldsSchema,
  mimeType: MimeType = 'audio/wav'
) {
  const apiKey = getGoogleAiApiKey()
  const model = getGeminiModel()
  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildGenerateContentBody(fileUri, fieldsSchema, mimeType)),
  })

  await assertOkResponse(response, 'Gemini transcription failed')

  const payload = (await response.json()) as GeminiGenerateContentResponse
  const text = extractTextOutput(payload)

  return parseConsultationOutput(text)
}

export async function deleteGeminiFile(fileName: FileName) {
  const apiKey = getGoogleAiApiKey()
  const response = await fetch(`${GEMINI_API_BASE_URL}/${fileName}?key=${apiKey}`, {
    method: 'DELETE',
  })

  await assertDeletedOrNotFound(response)
}

async function assertDeletedOrNotFound(response: Response) {
  if (!response.ok && response.status !== 404) {
    throw new Error(`Gemini file deletion failed: ${await parseErrorResponse(response)}`)
  }
}