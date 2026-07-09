"use client"

import { useState, useCallback } from "react"
import type { ConsultationOutput } from "@/lib/bamlClient"
import { buildConsultationFieldSchema } from "@/lib/consultation-fields"

interface UseTranscribeOptions {
  onSuccess?: (data: ConsultationOutput) => void
  onError?: (error: Error) => void
}

type TranscribePhase = "idle" | "uploading" | "transcribing" | "deleting" | "done" | "error"

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

async function uploadAudioViaBackend(audioBlob: Blob, contentType: string) {
  const response = await fetch("/api/audio/upload", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-File-Name": "consultation.webm",
    },
    body: audioBlob,
  })

  if (!response.ok) {
    throw new Error(await getTranscriptionErrorMessage(response))
  }

  return (await response.json()) as {
    objectKey: string
    uploadedVia: "server-fallback"
  }
}

export function useTranscribe(options?: UseTranscribeOptions) {
  const [data, setData] = useState<ConsultationOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [phase, setPhase] = useState<TranscribePhase>("idle")
  const [audioObjectKey, setAudioObjectKey] = useState<string | null>(null)

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

        let uploadResponse: Response

        try {
          uploadResponse = await fetch(uploadPayload.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": contentType,
            },
            body: audioBlob,
          })
        } catch (uploadError) {
          const fallbackUpload = await uploadAudioViaBackend(audioBlob, contentType)
          setAudioObjectKey(fallbackUpload.objectKey)
          setPhase("transcribing")

          const fallbackResponse = await fetch("/api/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              objectKey: fallbackUpload.objectKey,
              fieldsSchema: buildConsultationFieldSchema(),
              contentType,
            }),
          })

          if (!fallbackResponse.ok) {
            throw new Error(await getTranscriptionErrorMessage(fallbackResponse))
          }

          const fallbackResult: ConsultationOutput = await fallbackResponse.json()
          setData(fallbackResult)
          setPhase("done")
          options?.onSuccess?.(fallbackResult)
          return fallbackResult
        }

        if (!uploadResponse.ok) {
          throw new Error(`Audio upload failed: ${uploadResponse.statusText}`)
        }

        setAudioObjectKey(uploadPayload.objectKey)

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

  const deleteUploadedAudio = useCallback(async () => {
    if (!audioObjectKey) {
      return
    }

    setIsLoading(true)
    setError(null)
    setPhase("deleting")

    try {
      const response = await fetch("/api/audio/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objectKey: audioObjectKey,
        }),
      })

      if (!response.ok) {
        throw new Error(await getTranscriptionErrorMessage(response))
      }

      setAudioObjectKey(null)
      setPhase("idle")
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setPhase("error")
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [audioObjectKey, options])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
    setAudioObjectKey(null)
    setPhase("idle")
  }, [])

  return {
    transcribeAudio,
    data,
    isLoading,
    error,
    phase,
    audioObjectKey,
    deleteUploadedAudio,
    reset,
  }
}
