-- MacLoans schema (PostgreSQL / Neon). Idempotent: safe to run repeatedly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  full_name      text NOT NULL,
  phone          text,
  company        text,
  role           text NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant', 'underwriter', 'admin')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Lender-configurable underwriting rules, one row per loan product.
CREATE TABLE IF NOT EXISTS lender_guidelines (
  loan_type   text PRIMARY KEY,
  rules       jsonb NOT NULL,
  updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS application_ref_seq START 10001;

CREATE TABLE IF NOT EXISTS applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number           text NOT NULL UNIQUE DEFAULT ('ML-' || nextval('application_ref_seq')),
  applicant_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_type            text NOT NULL,
  status               text NOT NULL DEFAULT 'draft',
  data                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Automated underwriting output
  engine_decision      text,
  engine_result        jsonb,
  engine_run_at        timestamptz,
  -- Human underwriting decision
  final_decision       text,
  final_decision_note  text,
  final_decision_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  final_decision_at    timestamptz,
  overridden           boolean NOT NULL DEFAULT false,
  assigned_to          uuid REFERENCES users(id) ON DELETE SET NULL,
  submitted_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applications_applicant_idx ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);

CREATE TABLE IF NOT EXISTS conditions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  source          text NOT NULL CHECK (source IN ('engine', 'underwriter')),
  code            text,
  description     text NOT NULL,
  doc_category    text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'satisfied', 'waived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);
CREATE INDEX IF NOT EXISTS conditions_application_idx ON conditions(application_id);

CREATE TABLE IF NOT EXISTS documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  uploaded_by     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        text NOT NULL,
  filename        text NOT NULL,
  content_type    text NOT NULL,
  size_bytes      integer NOT NULL,
  content         bytea NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  review_note     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_application_idx ON documents(application_id);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  internal        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_application_idx ON messages(application_id);

-- Audit trail of every state change on an application.
CREATE TABLE IF NOT EXISTS activity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  detail          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_application_idx ON activity(application_id);
