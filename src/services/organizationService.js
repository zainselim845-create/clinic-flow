import { authClient } from '../lib/auth-client';
import { CLINIC_PERMISSIONS, CLINIC_ROLE_PERMISSIONS, hasClinicPermission } from '../lib/better-auth.config';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from './auditLoggerService';
import { ok, fail } from '../lib/apiResult';

const ORG_STORAGE_KEY = 'clinicflow_active_org_id';
const LOCAL_ORGS_KEY = 'clinicflow_mock_organizations';

function getStoredOrgs() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_ORGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredOrgs(orgs) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_ORGS_KEY, JSON.stringify(orgs));
  } catch (e) {
    console.error('Failed to save organizations to storage', e);
  }
}

function safeRecordAudit(action, details, entityId = '') {
  try {
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.USER_LOGIN || 'ORGANIZATION_EVENT',
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      entityId,
      entityType: 'organization'
    });
  } catch {
    // Non-blocking audit logger safety
  }
}

/**
 * Create a new clinic organization
 */
export async function createOrganization({ name, slug, logo = null, metadata = {} }) {
  try {
    const id = 'org-' + Math.random().toString(36).substring(2, 10);
    const newOrg = {
      id,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      logo,
      metadata,
      createdAt: new Date().toISOString(),
      members: []
    };

    const orgs = getStoredOrgs();
    orgs.push(newOrg);
    saveStoredOrgs(orgs);
    await setActiveOrganization(newOrg.id);

    safeRecordAudit('create_organization', { orgId: newOrg.id, slug: newOrg.slug }, newOrg.id);

    // Also attempt remote client sync if available and in browser
    if (typeof window !== 'undefined' && authClient?.organization?.create) {
      authClient.organization.create({ name, slug: newOrg.slug, logo, metadata }).catch(() => {});
    }

    return ok(newOrg);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Set active organization for the current session
 */
export async function setActiveOrganization(organizationId) {
  try {
    if (!organizationId) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(ORG_STORAGE_KEY);
      return ok(null);
    }

    if (typeof localStorage !== 'undefined') localStorage.setItem(ORG_STORAGE_KEY, organizationId);

    if (typeof window !== 'undefined' && authClient?.organization?.setActive) {
      authClient.organization.setActive({ organizationId }).catch(() => {});
    }

    return ok({ activeOrganizationId: organizationId });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Get active organization ID
 */
export function getActiveOrganizationId() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(ORG_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * List all organizations for the current user
 */
export async function listOrganizations() {
  try {
    const orgs = getStoredOrgs();
    return ok(orgs);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Invite a staff member to an organization
 */
export async function inviteStaffMember({ organizationId, email, role = 'member' }) {
  try {
    if (!email || !organizationId) {
      return fail(new Error('البريد الإلكتروني ومعرف المنظمة مطلوبان'));
    }

    const orgs = getStoredOrgs();
    const org = orgs.find(o => o.id === organizationId);
    if (!org) {
      return fail(new Error('المنظمة غير موجودة'));
    }

    const invitation = {
      id: 'inv-' + Math.random().toString(36).substring(2, 9),
      organizationId,
      email,
      role,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (!org.invitations) org.invitations = [];
    org.invitations.push(invitation);
    saveStoredOrgs(orgs);

    safeRecordAudit('invite_staff_member', { organizationId, email, role }, invitation.id);

    if (typeof window !== 'undefined' && authClient?.organization?.inviteMember) {
      authClient.organization.inviteMember({ organizationId, email, role }).catch(() => {});
    }

    return ok(invitation);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Check if a role has specific permission
 */
export function canAccess(role, permission) {
  return hasClinicPermission(role, permission);
}

export { CLINIC_PERMISSIONS, CLINIC_ROLE_PERMISSIONS };
