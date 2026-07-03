BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS agentnotes;

SET search_path TO agentnotes, public;

CREATE OR REPLACE FUNCTION agentnotes.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  full_name text NOT NULL,
  date_of_birth date,
  sex text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  audio_object_key text,
  transcript_final text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  uncertain_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  consultation_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  schema_version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_templates_field_type_check CHECK (field_type IN ('text', 'textarea', 'enum', 'date', 'number'))
);

CREATE TABLE IF NOT EXISTS consultation_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  field_template_id uuid NOT NULL REFERENCES field_templates(id) ON DELETE RESTRICT,
  field_key_snapshot text NOT NULL,
  field_value text,
  confidence numeric(5,4),
  source text NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultation_fields_source_check CHECK (source IN ('ai', 'manual', 'imported')),
  CONSTRAINT consultation_fields_confidence_check CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT consultation_fields_unique_field UNIQUE (consultation_id, field_template_id)
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_object_key text,
  output_object_key text,
  mime_type text NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultations_patient_id_idx
  ON consultations (patient_id, consultation_at DESC);

CREATE INDEX IF NOT EXISTS consultation_fields_consultation_idx
  ON consultation_fields (consultation_id);

CREATE INDEX IF NOT EXISTS generated_documents_consultation_idx
  ON generated_documents (consultation_id, generated_at DESC);

DROP TRIGGER IF EXISTS patients_set_updated_at ON patients;
CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION agentnotes.set_updated_at();

DROP TRIGGER IF EXISTS consultations_set_updated_at ON consultations;
CREATE TRIGGER consultations_set_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION agentnotes.set_updated_at();

DROP TRIGGER IF EXISTS field_templates_set_updated_at ON field_templates;
CREATE TRIGGER field_templates_set_updated_at
  BEFORE UPDATE ON field_templates
  FOR EACH ROW
  EXECUTE FUNCTION agentnotes.set_updated_at();

DROP TRIGGER IF EXISTS consultation_fields_set_updated_at ON consultation_fields;
CREATE TRIGGER consultation_fields_set_updated_at
  BEFORE UPDATE ON consultation_fields
  FOR EACH ROW
  EXECUTE FUNCTION agentnotes.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agentnotes_app') THEN
    GRANT USAGE ON SCHEMA agentnotes TO agentnotes_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA agentnotes TO agentnotes_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA agentnotes TO agentnotes_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA agentnotes
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agentnotes_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA agentnotes
      GRANT USAGE, SELECT ON SEQUENCES TO agentnotes_app;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agentnotes_readonly') THEN
    GRANT USAGE ON SCHEMA agentnotes TO agentnotes_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA agentnotes TO agentnotes_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA agentnotes
      GRANT SELECT ON TABLES TO agentnotes_readonly;
  END IF;
END;
$$;

COMMIT;