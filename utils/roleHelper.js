/**
 * Centralized Role Normalization & Authorization Helper
 *
 * Ensures canonical role integrity across the system:
 * - Canonical roles stored in MongoDB: 'admin', 'manager', 'officer', 'citizen'
 * - Normalizes role aliases and case variations strictly at authentication & input boundaries
 * - Provides display label formatters and RBAC predicate utilities
 */

const ROLES = Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    OFFICER: 'officer',
    CITIZEN: 'citizen'
});

const CANONICAL_ROLES = Object.freeze(Object.values(ROLES));

/**
 * Normalizes input role strings/aliases into canonical lowercase values.
 * Used strictly at authentication and request boundaries.
 * 
 * @param {string} inputRole
 * @returns {string} One of 'admin', 'manager', 'officer', 'citizen'
 */
function normalizeRole(inputRole) {
    if (!inputRole || typeof inputRole !== 'string') {
        return ROLES.CITIZEN;
    }

    const clean = inputRole.trim().toLowerCase().replace(/[-\s]+/g, '_');

    // Admin aliases
    if (clean === 'admin' || clean === 'system_admin' || clean === 'administrator' || clean === 'sysadmin') {
        return ROLES.ADMIN;
    }

    // Manager aliases
    if (clean === 'manager' || clean === 'civic_manager' || clean === 'grievance_manager') {
        return ROLES.MANAGER;
    }

    // Officer aliases
    if (clean === 'officer' || clean === 'field_officer' || clean === 'fieldofficer') {
        return ROLES.OFFICER;
    }

    // Citizen aliases
    if (clean === 'citizen' || clean === 'resident' || clean === 'user') {
        return ROLES.CITIZEN;
    }

    return ROLES.CITIZEN;
}

/**
 * Returns user-facing capitalized label for display.
 * 
 * @param {string} role
 * @returns {string} e.g. 'Administrator', 'Manager', 'Field Officer', 'Citizen'
 */
function formatRoleLabel(role) {
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

function isAdminRole(role) {
    return normalizeRole(role) === ROLES.ADMIN;
}

function isManagerRole(role) {
    return normalizeRole(role) === ROLES.MANAGER;
}

function isOfficerRole(role) {
    return normalizeRole(role) === ROLES.OFFICER;
}

function isStaffRole(role) {
    const canonical = normalizeRole(role);
    return canonical === ROLES.ADMIN || canonical === ROLES.MANAGER || canonical === ROLES.OFFICER;
}

module.exports = {
    ROLES,
    CANONICAL_ROLES,
    normalizeRole,
    formatRoleLabel,
    isAdminRole,
    isManagerRole,
    isOfficerRole,
    isStaffRole
};

