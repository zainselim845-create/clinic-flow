-- =========================================================================
-- Migration 006: Better Auth Core & Multi-Tenant Organization RBAC Schema
-- ClinicFlow System Migration
-- =========================================================================

-- Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Core Better Auth Tables
-- -------------------------------------------------------------------------

-- 1.1 User Table
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT DEFAULT 'user',
    "banned" BOOLEAN DEFAULT FALSE,
    "banReason" TEXT,
    "banExpires" TIMESTAMPTZ
);

-- 1.2 Session Table
CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "activeOrganizationId" TEXT
);

-- 1.3 Account Table (Credentials & OAuth Providers)
CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Verification Table (Tokens & OTPs)
CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. Organization Plugin Tables (Multi-Tenancy & RBAC)
-- -------------------------------------------------------------------------

-- 2.1 Organization Table (Clinics)
CREATE TABLE IF NOT EXISTS "organization" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE,
    "logo" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}'::jsonb
);

-- 2.2 Member Table (Clinic Staff & Roles)
CREATE TABLE IF NOT EXISTS "member" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_org_user" UNIQUE ("organizationId", "userId")
);

-- 2.3 Invitation Table (Invitations for Assistant Doctors & Staff)
CREATE TABLE IF NOT EXISTS "invitation" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "inviterId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 3. High-Performance B-Tree Composite Indexes
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("email");
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_session_active_org" ON "session"("activeOrganizationId");
CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_provider" ON "account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");
CREATE INDEX IF NOT EXISTS "idx_organization_slug" ON "organization"("slug");
CREATE INDEX IF NOT EXISTS "idx_member_org_user" ON "member"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "idx_member_user" ON "member"("userId");
CREATE INDEX IF NOT EXISTS "idx_invitation_org" ON "invitation"("organizationId");
CREATE INDEX IF NOT EXISTS "idx_invitation_email" ON "invitation"("email");
CREATE INDEX IF NOT EXISTS "idx_invitation_status" ON "invitation"("status");

-- -------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Policies
-- -------------------------------------------------------------------------

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;

-- 4.1 Organization View & Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organization' AND policyname = 'org_member_read_policy'
    ) THEN
        CREATE POLICY "org_member_read_policy" ON "organization"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM "member"
                    WHERE "member"."organizationId" = "organization"."id"
                    AND "member"."userId" = auth.uid()::text
                )
            );
    END IF;
END $$;

-- 4.2 Member Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'member' AND policyname = 'member_org_read_policy'
    ) THEN
        CREATE POLICY "member_org_read_policy" ON "member"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                "member"."userId" = auth.uid()::text OR
                EXISTS (
                    SELECT 1 FROM "member" m2
                    WHERE m2."organizationId" = "member"."organizationId"
                    AND m2."userId" = auth.uid()::text
                )
            );
    END IF;
END $$;

-- 4.3 Invitation Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invitation' AND policyname = 'invitation_read_policy'
    ) THEN
        CREATE POLICY "invitation_read_policy" ON "invitation"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                "invitation"."email" = (SELECT "email" FROM "user" WHERE "id" = auth.uid()::text) OR
                EXISTS (
                    SELECT 1 FROM "member"
                    WHERE "member"."organizationId" = "invitation"."organizationId"
                    AND "member"."userId" = auth.uid()::text
                    AND "member"."role" IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 5. Bidirectional Synchronization View
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW "view_clinic_organizations" AS
SELECT 
    o."id" AS organization_id,
    o."name" AS clinic_name,
    o."slug" AS clinic_slug,
    o."logo" AS logo_url,
    o."createdAt" AS created_at,
    o."metadata" AS organization_metadata,
    c."subscription_tier",
    c."subscription_status",
    c."quotas"
FROM "organization" o
LEFT JOIN "clinics" c ON c."slug" = o."slug" OR c."id"::text = o."id";
