/**
 * Mobile App Role Helper & Display Normalizer
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OFFICER: 'officer',
  CITIZEN: 'citizen',
} as const;

export type CanonicalRole = typeof ROLES[keyof typeof ROLES];

export const CANONICAL_ROLES: readonly CanonicalRole[] = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.OFFICER,
  ROLES.CITIZEN,
];

export function normalizeRole(inputRole?: string | null): CanonicalRole {
  if (!inputRole || typeof inputRole !== 'string') {
    return ROLES.CITIZEN;
  }

  const clean = inputRole.trim().toLowerCase().replace(/[-\s]+/g, '_');

  if (clean === 'admin' || clean === 'system_admin' || clean === 'administrator' || clean === 'sysadmin') {
    return ROLES.ADMIN;
  }
  if (clean === 'manager' || clean === 'civic_manager' || clean === 'grievance_manager') {
    return ROLES.MANAGER;
  }
  if (clean === 'officer' || clean === 'field_officer' || clean === 'fieldofficer') {
    return ROLES.OFFICER;
  }
  if (clean === 'citizen' || clean === 'resident' || clean === 'user') {
    return ROLES.CITIZEN;
  }

  return ROLES.CITIZEN;
}

export function formatRoleLabel(role?: string | null): string {
  const canonical = normalizeRole(role);
  switch (canonical) {
    case ROLES.ADMIN:
      return 'Administrator';
    case ROLES.MANAGER:
      return 'Manager';
    case ROLES.OFFICER:
      return 'Field Officer';
    case ROLES.CITIZEN:
      return 'Citizen';
    default:
      return 'Citizen';
  }
}

export function isStaffRole(role?: string | null): boolean {
  const canonical = normalizeRole(role);
  return canonical === ROLES.ADMIN || canonical === ROLES.MANAGER || canonical === ROLES.OFFICER;
}
