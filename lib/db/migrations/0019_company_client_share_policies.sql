-- Company Client Page Share policy defaults (P6)
-- Spec: specs/domain/creation-client-share.md

CREATE TABLE IF NOT EXISTS company_client_share_policies (
  company_id text PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  allow_public_link boolean NOT NULL DEFAULT false,
  require_password boolean NOT NULL DEFAULT true,
  max_ttl_days integer,
  allow_live_head boolean NOT NULL DEFAULT true,
  allow_email_allowlist boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id text
);
