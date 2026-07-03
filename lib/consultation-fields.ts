export const CONSULTATION_FIELD_KEYS = [
  "motivo_consulta",
  "enfermedad_actual",
  "estado_general",
  "diagnosticos",
  "conducta",
  "medicamentos",
] as const

export type ConsultationFieldKey = (typeof CONSULTATION_FIELD_KEYS)[number]

export const CONSULTATION_FIELD_LABELS: Record<ConsultationFieldKey, string> = {
  motivo_consulta: "Motivo de Consulta",
  enfermedad_actual: "Enfermedad Actual",
  estado_general: "Estado General",
  diagnosticos: "Diagnósticos",
  conducta: "Conducta / Plan de Tratamiento",
  medicamentos: "Medicamentos",
}

export function buildConsultationFieldSchema() {
  return CONSULTATION_FIELD_KEYS.map(
    (key) => `${key}: ${CONSULTATION_FIELD_LABELS[key]}`
  ).join("\n")
}

export function normalizeStructuredFields(
  structuredFields: Partial<Record<string, string>>
) {
  return CONSULTATION_FIELD_KEYS.reduce<Record<ConsultationFieldKey, string>>(
    (accumulator, key) => {
      accumulator[key] = structuredFields[key]?.trim() ?? ""
      return accumulator
    },
    {
      motivo_consulta: "",
      enfermedad_actual: "",
      estado_general: "",
      diagnosticos: "",
      conducta: "",
      medicamentos: "",
    }
  )
}