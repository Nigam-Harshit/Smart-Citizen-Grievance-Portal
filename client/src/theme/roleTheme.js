/**
 * Centralized Role-Theme System for Web/PWA
 * 
 * Source of truth: mobile/src/theme/roleTheme.ts & mobile/src/screens/HomeScreen.tsx
 * 
 * Provides unified role tokens and visual treatment properties:
 * - primary: primary brand accent hex
 * - secondary: lighter secondary accent hex
 * - badgeBg: translucent badge background fill
 * - badgeBorder: badge border color
 * - badgeText: badge text color
 * - roleLabel: uppercase label text
 * - icon: role emoji identifier
 * - surfaceTint: subtle atmospheric surface fill (derived from mobile heroCard / badgeBg)
 * - surfaceGradient: frosted glass atmospheric surface wash
 * - cardBorder: translucent card outline matching mobile borderColor
 * - glow: atmospheric drop shadow / box shadow tint
 * - primaryBtnText: high-contrast text color for primary filled actions
 */

export const getRoleTheme = (role) => {
  const normalized = (role || 'citizen').toLowerCase();

  switch (normalized) {
    case 'officer':
    case 'field_officer':
    case 'staff':
      return {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeBorder: '#3B82F6',
        badgeText: '#60A5FA',
        roleLabel: 'FIELD OFFICER',
        icon: '👮',
        surfaceTint: 'rgba(59, 130, 246, 0.12)',
        surfaceGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14) 0%, rgba(16, 24, 38, 0.70) 100%)',
        cardBorder: 'rgba(59, 130, 246, 0.32)',
        glow: 'rgba(59, 130, 246, 0.22)',
        primaryBtnText: '#FFFFFF',
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
        surfaceTint: 'rgba(16, 185, 129, 0.12)',
        surfaceGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(16, 24, 38, 0.70) 100%)',
        cardBorder: 'rgba(16, 185, 129, 0.32)',
        glow: 'rgba(16, 185, 129, 0.22)',
        primaryBtnText: '#FFFFFF',
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
        surfaceTint: 'rgba(139, 92, 246, 0.12)',
        surfaceGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.14) 0%, rgba(16, 24, 38, 0.70) 100%)',
        cardBorder: 'rgba(139, 92, 246, 0.32)',
        glow: 'rgba(139, 92, 246, 0.22)',
        primaryBtnText: '#FFFFFF',
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
        surfaceTint: 'rgba(201, 150, 44, 0.12)',
        surfaceGradient: 'linear-gradient(135deg, rgba(201, 150, 44, 0.14) 0%, rgba(16, 24, 38, 0.70) 100%)',
        cardBorder: 'rgba(201, 150, 44, 0.32)',
        glow: 'rgba(201, 150, 44, 0.22)',
        primaryBtnText: '#0B1220',
      };
  }
};

export default getRoleTheme;
