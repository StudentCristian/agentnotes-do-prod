"use client"

import { useState, useCallback } from "react"
import type { ConsultationOutput } from "@/lib/bamlClient"
import { buildConsultationFieldSchema } from "@/lib/consultation-fields"

interface UseTranscribeOptions {
  onSuccess?: (data: ConsultationOutput) => void
  onError?: (error: Error) => void
}

type TranscribePhase = "idle" | "uploading" | "transcribing" | "done" | "error"

function normalizeRecordedAudioContentType(contentType: string) {
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase()

  if (!mediaType || mediaType === "video/webm") {
    return "audio/webm"
  }

  return mediaType
}

async function getTranscriptionErrorMessage(response: Response) {
  try {
    const errorPayload = (await response.json()) as { error?: string }
    if (errorPayload.error) {
      return errorPayload.error
    }
  } catch {
    // Ignore invalid error payloads and keep the HTTP status message.
  }

  return `Transcription failed: ${response.statusText}`
}

export function useTranscribe(options?: UseTranscribeOptions) {
  const [data, setData] = useState<ConsultationOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [phase, setPhase] = useState<TranscribePhase>("idle")

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      const contentType = normalizeRecordedAudioContentType(audioBlob.type)

      setIsLoading(true)
      setError(null)
      setData(null)
      setPhase("uploading")

      try {
        const uploadUrlResponse = await fetch("/api/audio/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: "consultation.webm",
            contentType,
          }),
        })

        if (!uploadUrlResponse.ok) {
          throw new Error(await getTranscriptionErrorMessage(uploadUrlResponse))
        }

        const uploadPayload = (await uploadUrlResponse.json()) as {
          uploadUrl: string
          objectKey: string
        }

        const uploadResponse = await fetch(uploadPayload.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
          },
          body: audioBlob,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Audio upload failed: ${uploadResponse.statusText}`)
        }

        setPhase("transcribing")

        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            objectKey: uploadPayload.objectKey,
            fieldsSchema: buildConsultationFieldSchema(),
            contentType,
          }),
        })

        if (!response.ok) {
          throw new Error(await getTranscriptionErrorMessage(response))
        }

        const result: ConsultationOutput = await response.json()
        setData(result)
        setPhase("done")
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setPhase("error")
        options?.onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
    setPhase("idle")
  }, [])

  return {
    transcribeAudio,
    data,
    isLoading,
    error,
    phase,
    reset,
  }
}
