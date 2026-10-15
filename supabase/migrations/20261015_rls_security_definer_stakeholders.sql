-- =========================================================================
-- ClinicFlow SaaS Hardening: RLS Infinite-Recursion Fix + Stakeholder Matrix
-- Migration: 20261015_rls_security_definer_stakeholders.sql
-- =========================================================================
-- 1. FIX: Infinite recursion (SQLSTATE 42P17) in member/organization policies.
--    The policies in 006_better_auth_and_organizations.sql queried `member`
--    from within a policy ON `member` (self-reference). PostgreSQL aborts
--    every evaluation with "infinite recursion detected in policy for
--    relation member". Fix = SECURITY DEFINER helper functions (owned by the
--    table owner, therefore bypassing RLS) so policies never subquery the
--    table they protect.
--
-- 2. STAKEHOLDER SEPARATION: role-scoped policies for the clinic tables
--    (patients, appointments, invoices, payments, inventory_items,
--    prescriptions, journal_entries, journal_lines) distinguishing:
--      - Platform admin          (user.role = 'super_admin')
--      - Clinic leadership       (member.role owner/admin, user.role
--                                 owner/multi_clinic_owner/clinic_admin/admin)
--      - Prescribers             (leadership + doctor/associate_doctor)
--      - Financial staff         (leadership + accountant)
--      - Front desk / staff      (receptionist/secretary/staff)
--    Policies are ADDITIVE (IF NOT EXISTS) so public anonymous booking and
--    all pre-existing policies keep working.
--
-- 3. All helpers are STABLE, SECURITY DEFINER, and pin search_path = public
--    (Supabase security-lint requirements).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. SECURITY DEFINER helper layer (recursion-safe primitives)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cf_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::text;
$$;

CREATE OR REPLACE FUNCTION cf_user_org_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m."organizationId"
    FROM "member" m
    WHERE m."userId" = cf_current_user_id();
$$;

CREATE OR REPLACE FUNCTION cf_is_org_member(p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "member" m
        WHERE m."userId" = cf_current_user_id()
          AND m."organizationId" = p_org_id
    );
$$;

CREATE OR REPLACE FUNCTION cf_is_org_admin(p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "member" m
        WHERE m."userId" = cf_current_user_id()
          AND m."organizationId" = p_org_id
          AND m."role" IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION cf_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "user" u
        WHERE u."id" = cf_current_user_id()
          AND u."role" = 'super_admin'
    );
$$;

-- Effective clinic role for the current user. Resolution order:
--   1. better-auth membership mapped to the clinic through the
--      organization<->clinic bridge (slug or id) -> owner/admin/member
--   2. staff_members row for this clinic linked by auth email, mapped from
--      the provisioned auth user role (English taxonomy)
--   3. NULL when the caller has no relationship with the clinic
CREATE OR REPLACE FUNCTION cf_user_clinic_role(p_clinic_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT m."role"
            FROM "member" m
            WHERE m."userId" = cf_current_user_id()
              AND m."organizationId" IN (
                  SELECT o."id"
                  FROM "organization" o
                  JOIN "clinics" c
                    ON c."slug" = o."slug" OR c."id"::text = o."id"
                  WHERE c."id" = p_clinic_id
              )
            ORDER BY CASE m."role" WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
            LIMIT 1
        ),
        (
            SELECT u."role"
            FROM "user" u
            WHERE u."id" = cf_current_user_id()
              AND u."role" IN (
                  'owner', 'multi_clinic_owner', 'clinic_admin', 'admin',
                  'doctor', 'associate_doctor', 'accountant',
                  'receptionist', 'secretary', 'staff'
              )
              AND EXISTS (
                  SELECT 1 FROM staff_members sm
                  WHERE sm.clinic_id = p_clinic_id
                    AND sm.email IS NOT NULL
                    AND lower(sm.email) = lower(u."email")
              )
        )
    );
$$;

CREATE OR REPLACE FUNCTION cf_is_clinic_staff(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cf_user_clinic_role(p_clinic_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION cf_is_clinic_leader(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cf_user_clinic_role(p_clinic_id) IN (
        'owner', 'multi_clinic_owner', 'clinic_admin', 'admin'
    );
$$;

-- Clinical authors: leadership + treating doctors
CREATE OR REPLACE FUNCTION cf_is_clinic_prescriber(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cf_user_clinic_role(p_clinic_id) IN (
        'owner', 'multi_clinic_owner', 'clinic_admin', 'admin',
        'doctor', 'associate_doctor'
    );
$$;

-- Financial writers: leadership + accountants
CREATE OR REPLACE FUNCTION cf_is_clinic_financial(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cf_user_clinic_role(p_clinic_id) IN (
        'owner', 'multi_clinic_owner', 'clinic_admin', 'admin', 'accountant'
    );
$$;

-- Front-desk writers: everything except accountants (patients/appointments ops)
CREATE OR REPLACE FUNCTION cf_is_clinic_operational(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cf_user_clinic_role(p_clinic_id) IN (
        'owner', 'multi_clinic_owner', 'clinic_admin', 'admin',
        'doctor', 'associate_doctor',
        'receptionist', 'secretary', 'staff'
    );
$$;

GRANT EXECUTE ON FUNCTION
    cf_current_user_id(), cf_user_org_ids(), cf_is_org_member(text),
    cf_is_org_admin(text), cf_is_platform_admin(), cf_user_clinic_role(uuid),
    cf_is_clinic_staff(uuid), cf_is_clinic_leader(uuid),
    cf_is_clinic_prescriber(uuid), cf_is_clinic_financial(uuid),
    cf_is_clinic_operational(uuid)
TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 2. Recursion-free organization / member / invitation policies
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_member_read_policy" ON "organization";
CREATE POLICY "org_member_read_policy" ON "organization"
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        ("organization"."id"::text) IN (SELECT cf_user_org_ids())
    );

DROP POLICY IF EXISTS "member_org_read_policy" ON "member";
CREATE POLICY "member_org_read_policy" ON "member"
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        "member"."userId" = cf_current_user_id() OR
        ("member"."organizationId") IN (SELECT cf_user_org_ids())
    );

-- Writes on membership: organization admins / platform admins only
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member' AND policyname = 'member_admin_write_policy') THEN
        CREATE POLICY "member_admin_write_policy" ON "member"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_org_admin("member"."organizationId")
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member' AND policyname = 'member_admin_update_policy') THEN
        CREATE POLICY "member_admin_update_policy" ON "member"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_org_admin("member"."organizationId")
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member' AND policyname = 'member_admin_delete_policy') THEN
        CREATE POLICY "member_admin_delete_policy" ON "member"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_org_admin("member"."organizationId")
            );
    END IF;
END $$;

DROP POLICY IF EXISTS "invitation_read_policy" ON "invitation";
CREATE POLICY "invitation_read_policy" ON "invitation"
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        "invitation"."email" = (SELECT "email" FROM "user" WHERE "id" = cf_current_user_id()) OR
        cf_is_org_admin("invitation"."organizationId")
    );

-- -------------------------------------------------------------------------
-- 3. Stakeholder matrix on clinic tables (additive — public flows intact)
--    Read  = any clinic staff | leadership | platform admin
--    Write = role-scoped per data domain
--    Delete= leadership only
-- -------------------------------------------------------------------------

-- 3.1 prescriptions: historically UNPOLICIED (open to any authenticated
--     caller). Now: read = staff, write = prescribers, delete = leadership.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_staff_read') THEN
        CREATE POLICY "prescriptions_staff_read" ON "prescriptions"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_prescriber_write') THEN
        CREATE POLICY "prescriptions_prescriber_write" ON "prescriptions"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_prescriber(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_prescriber_update') THEN
        CREATE POLICY "prescriptions_prescriber_update" ON "prescriptions"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_prescriber(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_leader_delete') THEN
        CREATE POLICY "prescriptions_leader_delete" ON "prescriptions"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- 3.2 patients: read/operate = staff; delete = leadership
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'patients_stakeholder_read') THEN
        CREATE POLICY "patients_stakeholder_read" ON "patients"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'patients_operational_write') THEN
        CREATE POLICY "patients_operational_write" ON "patients"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_operational(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'patients_leader_delete') THEN
        CREATE POLICY "patients_leader_delete" ON "patients"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- 3.3 appointments: read = staff; operational writes (keeps the anonymous
--     public-booking INSERT policy from the strict-RLS migration untouched);
--     delete = leadership.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_stakeholder_read') THEN
        CREATE POLICY "appointments_stakeholder_read" ON "appointments"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_operational_write') THEN
        CREATE POLICY "appointments_operational_write" ON "appointments"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_operational(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_leader_delete') THEN
        CREATE POLICY "appointments_leader_delete" ON "appointments"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- 3.4 invoices + payments: financial-domain writes (leadership + accountant)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_stakeholder_read') THEN
        CREATE POLICY "invoices_stakeholder_read" ON "invoices"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_financial_write') THEN
        CREATE POLICY "invoices_financial_write" ON "invoices"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_financial(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_financial_update') THEN
        CREATE POLICY "invoices_financial_update" ON "invoices"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_financial(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_leader_delete') THEN
        CREATE POLICY "invoices_leader_delete" ON "invoices"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_stakeholder_read') THEN
        CREATE POLICY "payments_stakeholder_read" ON "payments"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_financial_write') THEN
        CREATE POLICY "payments_financial_write" ON "payments"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_financial(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_leader_delete') THEN
        CREATE POLICY "payments_leader_delete" ON "payments"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- 3.5 General ledger (journal_entries / journal_lines): financial writes only
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'journal_entries_stakeholder_read') THEN
        CREATE POLICY "journal_entries_stakeholder_read" ON "journal_entries"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'journal_entries_financial_write') THEN
        CREATE POLICY "journal_entries_financial_write" ON "journal_entries"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_financial(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'journal_entries_leader_delete') THEN
        CREATE POLICY "journal_entries_leader_delete" ON "journal_entries"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_lines' AND policyname = 'journal_lines_stakeholder_read') THEN
        CREATE POLICY "journal_lines_stakeholder_read" ON "journal_lines"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_lines' AND policyname = 'journal_lines_financial_write') THEN
        CREATE POLICY "journal_lines_financial_write" ON "journal_lines"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_financial(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_lines' AND policyname = 'journal_lines_leader_delete') THEN
        CREATE POLICY "journal_lines_leader_delete" ON "journal_lines"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- 3.6 inventory_items: read = staff, operational writes, leadership delete
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_stakeholder_read') THEN
        CREATE POLICY "inventory_stakeholder_read" ON "inventory_items"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_operational_write') THEN
        CREATE POLICY "inventory_operational_write" ON "inventory_items"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_operational(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_operational_update') THEN
        CREATE POLICY "inventory_operational_update" ON "inventory_items"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_operational(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'inventory_leader_delete') THEN
        CREATE POLICY "inventory_leader_delete" ON "inventory_items"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 4. Verification queries (uncomment to audit after applying):
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE tablename IN ('member','organization','invitation','prescriptions',
--                      'patients','appointments','invoices','payments',
--                      'journal_entries','journal_lines','inventory_items')
--  ORDER BY tablename, policyname;
-- -------------------------------------------------------------------------
