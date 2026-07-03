"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MicSelector } from "@/components/ui/mic-selector"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { Disc, Pause, Play, Trash2, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranscribe } from "@/lib/hooks/useTranscribe"
import type { ConsultationOutput } from "@/lib/bamlClient"

type RecordingState =
  | "idle"
  | "loading"
  | "recording"
  | "paused"
  | "recorded"
  | "playing"
  | "transcribing"

interface AudioBottomBarProps {
  onAudioRecorded?: (blob: Blob) => void
  onTranscriptionStart?: () => void
  onTranscriptionComplete?: (data: ConsultationOutput) => void
  onTranscriptionError?: (error: Error) => void
  disabled?: boolean
}

export function AudioBottomBar({
  onAudioRecorded,
  onTranscriptionStart,
  onTranscriptionComplete,
  onTranscriptionError,
  disabled = false,
}: AudioBottomBarProps) {
  const actionButtonClassName = "h-9 w-9 rounded-md hover:bg-accent"
  const [selectedDevice, setSelectedDevice] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const [state, setState] = useState<RecordingState>("idle")
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

  const { transcribeAudio, isLoading: isTranscribing } = useTranscribe({
    onSuccess: (data) => {
      setState("recorded")
      onTranscriptionComplete?.(data)
    },
    onError: (error) => {
      setState("recorded")
      setTranscriptionError(error.message)
      onTranscriptionError?.(error)
      console.error("Transcription error:", error)
    },
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null)
  const discardOnStopRef = useRef(false)

  const cleanupAudioPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
  }, [])

  const cleanupMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  const resetRecordingData = useCallback(() => {
    setAudioBlob(null)
    audioChunksRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      cleanupAudioPlayback()
      cleanupMediaStream()
    }
  }, [cleanupAudioPlayback, cleanupMediaStream])

  const startRecording = useCallback(async () => {
    try {
      setState("loading")
      setTranscriptionError(null)
      resetRecordingData()
      discardOnStopRef.current = false

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      })
      mediaStreamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        cleanupMediaStream()

        const shouldDiscard = discardOnStopRef.current
        discardOnStopRef.current = false

        const blob = audioChunksRef.current.length
          ? new Blob(audioChunksRef.current, { type: "audio/webm" })
          : null

        mediaRecorderRef.current = null

        if (shouldDiscard || !blob) {
          resetRecordingData()
          setState("idle")
          stopResolverRef.current?.(null)
          stopResolverRef.current = null
          return
        }

        setAudioBlob(blob)
        setState("recorded")
        onAudioRecorded?.(blob)
        stopResolverRef.current?.(blob)
        stopResolverRef.current = null
      }

      mediaRecorder.start()
      setState("recording")
    } catch (error) {
      console.error("Error starting recording:", error)
      cleanupMediaStream()
      setTranscriptionError("No se pudo iniciar la grabacion.")
      setState("idle")
    }
  }, [cleanupMediaStream, onAudioRecorded, resetRecordingData, selectedDevice])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause()
      setState("paused")
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      setTranscriptionError(null)
      mediaRecorderRef.current.resume()
      setState("recording")
    }
  }, [])

  const finalizeRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return audioBlob
    }

    return new Promise<Blob | null>((resolve) => {
      stopResolverRef.current = resolve
      mediaRecorderRef.current?.stop()
    })
  }, [audioBlob])

  const playRecording = useCallback(() => {
    if (!audioBlob) return

    cleanupAudioPlayback()

    const audio = new Audio(URL.createObjectURL(audioBlob))
    audioElementRef.current = audio

    audio.onended = () => {
      setState("recorded")
    }

    audio.play()
    setState("playing")
  }, [audioBlob, cleanupAudioPlayback])

  const pausePlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      setState("recorded")
    }
  }, [])

  const deleteRecording = useCallback(() => {
    cleanupAudioPlayback()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      discardOnStopRef.current = true
      mediaRecorderRef.current.stop()
    } else {
      cleanupMediaStream()
      resetRecordingData()
      setState("idle")
    }

    setTranscriptionError(null)
  }, [cleanupAudioPlayback, cleanupMediaStream, resetRecordingData])

  const handleTranscription = useCallback(async () => {
    let currentAudioBlob = audioBlob

    if (!currentAudioBlob && (state === "recording" || state === "paused")) {
      currentAudioBlob = await finalizeRecording()
    }

    if (!currentAudioBlob) {
      return
    }

    setState("transcribing")
    setTranscriptionError(null)
    onTranscriptionStart?.()

    try {
      await transcribeAudio(currentAudioBlob)
    } catch (error) {
      const transcriptionError =
        error instanceof Error ? error : new Error("Error desconocido al transcribir")
      setTranscriptionError(transcriptionError.message)
      onTranscriptionError?.(transcriptionError)
      console.error("Error in transcription:", transcriptionError)
      setState("recorded")
    }
  }, [audioBlob, finalizeRecording, onTranscriptionError, onTranscriptionStart, state, transcribeAudio])

  const showWaveform = state === "recording" && !isMuted
  const showProcessing = state === "loading" || state === "playing" || state === "transcribing"
  const showRecorded = state === "recorded"
  const hasRecording = audioBlob !== null || state === "recording" || state === "paused"

  return (
    <HoverBorderGradient
      as="div"
      duration={1.4}
      containerClassName="w-full rounded-2xl"
      className="w-full rounded-[inherit] bg-card text-card-foreground"
    >
      <Card className="m-0 w-full border-0 bg-transparent p-0 shadow-sm">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 p-2">
        {/* Waveform display */}
        <div className="h-8 w-full min-w-0 flex-1 md:w-[200px] md:flex-none">
          <div
            className={cn(
              "flex h-full items-center gap-2 rounded-md py-1",
              "bg-foreground/5 text-foreground/70"
            )}
          >
            <div className="h-full min-w-0 flex-1">
              <div className="relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-sm">
                <LiveWaveform
                  key={state}
                  active={showWaveform}
                  processing={showProcessing}
                  deviceId={selectedDevice}
                  barWidth={3}
                  barGap={1}
                  barRadius={4}
                  fadeEdges={true}
                  fadeWidth={24}
                  sensitivity={1.8}
                  smoothingTimeConstant={0.85}
                  height={20}
                  mode="scrolling"
                  className={cn(
                    "h-full w-full transition-opacity duration-300",
                    state === "idle" && "opacity-0"
                  )}
                />
                {state === "idle" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground/50 text-xs font-medium">
                      Presiona REC
                    </span>
                  </div>
                )}
                {state === "paused" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground/50 text-xs font-medium">
                      Grabacion en pausa
                    </span>
                  </div>
                )}
                {showRecorded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground/50 text-xs font-medium">
                      Listo
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex w-full flex-wrap items-center justify-center gap-1 md:w-auto">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-background/80 p-1 shadow-sm">
            <MicSelector
              value={selectedDevice}
              onValueChange={setSelectedDevice}
              muted={isMuted}
              onMutedChange={setIsMuted}
              disabled={state === "recording" || state === "paused" || state === "loading" || disabled}
            />
            {/* Rec / Pause / Resume */}
            {state === "idle" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={startRecording}
                disabled={isMuted || disabled}
                aria-label="Grabar"
                title="Iniciar grabación"
                className={actionButtonClassName}
              >
                <Disc className="size-5" />
              </Button>
            )}
            {state === "recording" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={pauseRecording}
                aria-label="Pausar"
                title="Pausar grabación"
                className={actionButtonClassName}
              >
                <Pause className="size-5" />
              </Button>
            )}
            {state === "paused" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resumeRecording}
                aria-label="Continuar"
                title="Continuar grabación"
                className={actionButtonClassName}
              >
                <Play className="size-5" />
              </Button>
            )}

            {/* Play / Pause */}
            {showRecorded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={playRecording}
                aria-label="Reproducir"
                title="Reproducir grabación"
                disabled={disabled}
                className={actionButtonClassName}
              >
                <Disc className="size-5 opacity-50" />
              </Button>
            )}
            {state === "playing" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={pausePlayback}
                aria-label="Pausar"
                title="Pausar reproducción"
                disabled={disabled}
                className={actionButtonClassName}
              >
                <Pause className="size-5" />
              </Button>
            )}

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasRecording || state === "loading" || state === "transcribing" || disabled}
                  aria-label="Eliminar"
                  title="Eliminar grabación"
                  className={actionButtonClassName}
                >
                  <Trash2 className="size-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar audio grabado</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción descartará el audio grabado de esta consulta. No se podrá recuperar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteRecording}>
                    Eliminar audio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Transcription trigger (Sparkles) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTranscription}
              disabled={!hasRecording || disabled || state === "loading" || isTranscribing}
              aria-label="Transcribir"
              title={state === "recording" || state === "paused" ? "Finalizar y transcribir con IA" : "Iniciar transcripción con IA"}
              className={cn(
                actionButtonClassName,
                "text-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
              )}
            >
              {isTranscribing ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
            </Button>
          </div>
        </div>
      </div>

      {transcriptionError && (
        <div className="border-t px-3 py-2">
          <p className="text-sm text-destructive">{transcriptionError}</p>
        </div>
      )}
      </Card>
    </HoverBorderGradient>
  )
}
