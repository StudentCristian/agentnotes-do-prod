// clients.baml

retry_policy MedicalTranscriptionRetry {
  max_retries 3
  strategy {
    type "exponential_backoff"
    delay_ms 500
    multiplier 2
    max_delay_ms 15000
  }
}

client<llm> GoogleGeminiClient {
  provider "google-ai"
  options {
    model "gemini-2.5-flash"
    api_key env.GOOGLE_AI_API_KEY
    media_url_handler {
      audio "send_url"
      image "send_base64"
      pdf "send_base64"
      video "send_base64"
    }
  }
  retry_policy MedicalTranscriptionRetry
}
