class ConsultationOutput {
  transcript_final string @description("Full verbatim transcription")
  structured_fields map<string, string> @description("Clinical fields extracted")
  warnings string[] @description("Clinical flags or alerts")
  missing_fields string[] @description("Fields mentioned but unclear")
  uncertain_fields string[] @description("Low-confidence extractions")
}

function TranscribeConsultation(audio: audio, fields_schema: string) -> ConsultationOutput {
  client GoogleGeminiClient
  prompt #"
    You are processing a clinical consultation audio recording.
    Transcribe completely and extract structured fields.

    Fields to extract: {{ fields_schema }}

    Audio: {{ audio }}

    {{ ctx.output_format }}
  "#
}
