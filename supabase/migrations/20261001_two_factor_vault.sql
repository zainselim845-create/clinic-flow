-- ==============================================================================
-- Migration: 20261001_two_factor_vault.sql
-- Description: Cloud Database-Backed 2FA Credential Vault for Enterprise Scale
-- Stores encrypted TOTP secrets, SHA-256 hashed backup codes, and trusted device fingerprints
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.two_factor_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_used_counter BIGINT DEFAULT 0,
  device_fingerprints JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_two_factor_enabled ON public.two_factor_credentials(enabled);

-- Enable Row Level Security (RLS)
ALTER TABLE public.two_factor_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own 2FA credentials" ON public.two_factor_credentials;
DROP POLICY IF EXISTS "Users can insert own 2FA credentials" ON public.two_factor_credentials;
DROP POLICY IF EXISTS "Users can update own 2FA credentials" ON public.two_factor_credentials;
DROP POLICY IF EXISTS "Users can delete own 2FA credentials" ON public.two_factor_credentials;

-- Strict Isolation: Authenticated user can ONLY access their own 2FA records
CREATE POLICY "Users can view own 2FA credentials"
  ON public.two_factor_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA credentials"
  ON public.two_factor_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA credentials"
  ON public.two_factor_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA credentials"
  ON public.two_factor_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
