import { normalizeRole, ROLES } from '../utils/roleHelper';

export interface RoleTheme {
  primary: string;
  secondary: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  roleLabel: string;
  icon: string;
}

export const getRoleTheme = (role?: string): RoleTheme => {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.OFFICER:
      return {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeBorder: '#3B82F6',
        badgeText: '#60A5FA',
        roleLabel: 'Field Officer',
        icon: '👮',
      };
    case ROLES.MANAGER:
      return {
        primary: '#10B981',
        secondary: '#34D399',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeBorder: '#10B981',
        badgeText: '#34D399',
        roleLabel: 'Manager',
        icon: '📊',
      };
    case ROLES.ADMIN:
      return {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        badgeBorder: '#8B5CF6',
        badgeText: '#A78BFA',
        roleLabel: 'Administrator',
        icon: '👑',
      };
    case ROLES.CITIZEN:
    default:
      return {
        primary: '#C9962C',
        secondary: '#EAB308',
        badgeBg: 'rgba(201, 150, 44, 0.15)',
        badgeBorder: '#C9962C',
        badgeText: '#EAB308',
        roleLabel: 'Citizen',
        icon: '🏡',
      };
  }
};

