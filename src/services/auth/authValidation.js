const LEGACY_DEMO_SLUGS = new Set([
  'dr-ahmed', 
  'dr-sara'
]);

const LEGACY_DEMO_EMAILS = new Set([
  'doctor@clinicflow.com',
  'sara.clinic@clinicflow.com',
  'owner@clinicflow.com',
  'reception@clinicflow.com'
]);

export function isDemoOrCorruptedTenant(t) {
  if (!t) return true;
  const slug = (t.slug || '').toLowerCase();
  const email = (t.doctorEmail || t.email || '').toLowerCase();

  if (LEGACY_DEMO_SLUGS.has(slug)) return true;
  if (LEGACY_DEMO_EMAILS.has(email)) return true;
  return false;
}

export function isDemoOrCorruptedUser(u) {
  if (!u) return true;
  const email = (u.email || '').toLowerCase();
  const id = (u.id || '').toLowerCase();

  if (LEGACY_DEMO_EMAILS.has(email)) return true;
  if (id === 'doc-master' || id === 'doc-sara-master' || id === 'user-multi-clinic-owner' || id === 'staff-reception-master') return true;
  return false;
}
