/**
 * Schema Evolution & Non-Destructive Data Preservation Guard
 * Enforces Arena's core architectural invariant:
 * "قاعدة البيانات لا نحذف سجلاً لأنه يشبه اسماً تجريبياً. أي تغيير في الـ schema
 * يبدأ بنسخة احتياطية واختبار استعادتها، ثم ترحيل غير هدّام يحافظ على الحقول القديمة."
 */

export const ESSENTIAL_TABLES = [
  'clinics',
  'patients',
  'appointments',
  'invoices',
  'expenses',
  'inventory_items',
  'staff_attendance'
];

export const MANDATORY_SYSTEM_COLUMNS = [
  'id',
  'clinic_id',
  'created_at'
];

/**
 * Validates that a proposed database schema migration is non-destructive
 * @param {Object} currentSchema - Mapping of table names to array of column names
 * @param {Object} targetSchema - Mapping of proposed table names to array of column names
 * @returns {{ isSafe: boolean, violations: string[] }}
 */
export function verifyNonDestructiveMigration(currentSchema = {}, targetSchema = {}) {
  const violations = [];

  // 1. Ensure no existing essential table is deleted
  for (const table of Object.keys(currentSchema)) {
    if (!targetSchema[table]) {
      violations.push(`DESTRUCTIVE_TABLE_DROP: Table "${table}" is missing from the target schema.`);
      continue;
    }

    // 2. Ensure no existing column is dropped
    const currentCols = new Set(currentSchema[table]);
    const targetCols = new Set(targetSchema[table]);

    for (const col of currentCols) {
      if (!targetCols.has(col)) {
        violations.push(`DESTRUCTIVE_COLUMN_DROP: Column "${col}" on table "${table}" was removed. Must be deprecated or retained.`);
      }
    }
  }

  // 3. Ensure mandatory multi-tenant audit columns are preserved on new tables
  for (const [table, cols] of Object.entries(targetSchema)) {
    const colSet = new Set(cols);
    if (table !== 'clinics') { // clinics table doesn't have clinic_id
      for (const required of MANDATORY_SYSTEM_COLUMNS) {
        if (!colSet.has(required)) {
          violations.push(`MISSING_SYSTEM_COLUMN: Table "${table}" lacks mandatory column "${required}".`);
        }
      }
    }
  }

  return {
    isSafe: violations.length === 0,
    violations
  };
}

/**
 * Validates that an entity ID is safe to query against Postgres UUID columns
 * @param {string} id
 * @returns {boolean}
 */
export function isValidPostgresUuid(id) {
  if (!id || typeof id !== 'string') return false;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(id);
}
