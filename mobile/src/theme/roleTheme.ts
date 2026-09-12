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
  const normalized = (role || 'citizen').toLowerCase();

  switch (normalized) {
    case 'officer':
    case 'field_officer':
      return {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeBorder: '#3B82F6',
        badgeText: '#60A5FA',
        roleLabel: 'FIELD OFFICER',
        icon: '👮',
      };
    case 'manager':
      return {
        primary: '#10B981',
        secondary: '#34D399',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeBorder: '#10B981',
        badgeText: '#34D399',
        roleLabel: 'CIVIC MANAGER',
        icon: '📊',
      };
    case 'admin':
      return {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        badgeBorder: '#8B5CF6',
        badgeText: '#A78BFA',
        roleLabel: 'SYSTEM ADMIN',
        icon: '👑',
      };
    case 'citizen':
    default:
      return {
        primary: '#C9962C',
        secondary: '#EAB308',
        badgeBg: 'rgba(201, 150, 44, 0.15)',
        badgeBorder: '#C9962C',
        badgeText: '#EAB308',
        roleLabel: 'CITIZEN',
        icon: '🏡',
      };
  }
};

