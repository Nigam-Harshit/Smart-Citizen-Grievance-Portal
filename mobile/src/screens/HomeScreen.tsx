import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchDutyQueue } from '../services/grievanceService';
import { getRoleTheme } from '../theme/roleTheme';

interface HomeScreenProps {
  user: any;
  onNavigate: (screen: any, params?: any) => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onNavigate, onLogout }) => {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [resolvedCount, setResolvedCount] = useState<number>(0);
  const [extraCount, setExtraCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const role = user?.role || 'citizen';
  const isOfficer = role === 'officer' || role === 'field_officer';
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';
  const isCitizen = !isOfficer && !isManager && !isAdmin;
  const theme = getRoleTheme(role);

  useEffect(() => {
    if (!user) {
      onLogout();
      return;
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) {
      onLogout();
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchDutyQueue();
      if (res.data) {
        const userRole = user.role;
        let queue: any[] = [];
        let active = 0;

        if (userRole === 'admin') {
          queue = res.data.systemBreached || [];
          active = (res.data.healthSummary?.open || 0) + (res.data.healthSummary?.inProgress || 0);
          setExtraCount(res.data.breachedCount || queue.length);
        } else if (userRole === 'officer' || userRole === 'field_officer') {
          queue = res.data.myQueue || [];
          active = res.data.myQueueCount ?? queue.length;
        } else if (userRole === 'manager') {
          queue = res.data.unassignedInScope || [];
          active = res.data.unassignedCount ?? queue.length;
          setExtraCount(res.data.breachingCount || 0);
        } else {
          queue = res.data.myGrievances || [];
          active = res.data.myCount ?? queue.length;
        }

        setGrievances(queue);
        setActiveCount(active);
        setResolvedCount(res.data.resolvedCount ?? res.data.healthSummary?.resolved ?? 0);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load live duty queue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* App Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.appTitle, { color: theme.primary }]}>🏛️ Smart Citizen</Text>
            <View style={[styles.roleBadgeHeader, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
              <Text style={[styles.roleBadgeHeaderText, { color: theme.badgeText }]}>
                {theme.icon} {theme.roleLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.welcomeText}>Hello, {user?.name || theme.roleLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: theme.primary }]}
            onPress={() => onNavigate('Profile')}
          >
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogout}
          >
            <Text style={styles.logoutBtnText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Action Hero Banner */}
        {isAdmin ? (
          <View style={[styles.heroCard, { borderLeftColor: theme.primary, borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}>
            <Text style={styles.heroTitle}>System Administration Portal</Text>
            <Text style={styles.heroSub}>
              City-wide municipal grievance metrics, SLA breach monitoring, staff directory & audit controls.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => onNavigate('StaffDirectory')}
              >
                <Text style={styles.heroActionBtnText}>👥 Staff Directory</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: theme.secondary }]}
                onPress={() => onNavigate('AuditLogs')}
              >
                <Text style={[styles.heroActionBtnText, { color: theme.secondary }]}>📜 Audit Logs</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isManager ? (
          <View style={[styles.heroCard, { borderLeftColor: theme.primary, borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}>
            <Text style={styles.heroTitle}>Civic Manager Oversight</Text>
            <Text style={styles.heroSub}>
              Department Scope: <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>{user?.scope || 'All Categories'}</Text>. Review unassigned tickets, assign field officers, and monitor SLA breaches.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => onNavigate('StaffDirectory')}
              >
                <Text style={styles.heroActionBtnText}>👥 Staff Directory</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: theme.secondary }]}
                onPress={() => onNavigate('MyGrievances')}
              >
                <Text style={[styles.heroActionBtnText, { color: theme.secondary }]}>📋 Scope Tickets</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isOfficer ? (
          <View style={[styles.heroCard, { borderLeftColor: theme.primary, borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}>
            <Text style={styles.heroTitle}>Field Officer Duty Queue</Text>
            <Text style={styles.heroSub}>
              Inspect assigned complaints, perform on-site verifications, and submit official resolution reports.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={[styles.prioBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                <Text style={[styles.prioText, { color: theme.secondary }]}>
                  👮 Field Tasks Assigned: {activeCount}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Lodge a Public Grievance</Text>
            <Text style={styles.heroSub}>Report sanitation, water, road, or safety issues directly to zonal municipal officers.</Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => onNavigate('SubmitGrievance')}>
              <Text style={styles.heroBtnText}>➕ Lodge New Grievance</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statTile, { borderLeftColor: theme.primary }]}>
            <Text style={[styles.statNumber, { color: theme.secondary }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>
              {isAdmin ? 'Active System' : isManager ? 'Unassigned in Scope' : isOfficer ? 'Assigned Tasks' : 'Active Complaints'}
            </Text>
          </View>
          <View style={[styles.statTile, { borderLeftColor: '#10B981' }]}>
            <Text style={[styles.statNumber, { color: '#34D399' }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved Tickets</Text>
          </View>
          {(isAdmin || isManager) && (
            <View style={[styles.statTile, { borderLeftColor: '#EF4444' }]}>
              <Text style={[styles.statNumber, { color: '#F87171' }]}>{extraCount}</Text>
              <Text style={styles.statLabel}>{isAdmin ? 'SLA Breached' : 'Breaching Scope'}</Text>
            </View>
          )}
        </View>

        {/* Duty Queue Widget Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isAdmin
              ? '🚨 Breached SLA Tickets'
              : isManager
              ? '📋 Unassigned Tickets in Scope'
              : isOfficer
              ? '🚨 My Assigned Field Tasks'
              : '📋 My Active Complaints'}
          </Text>
          <TouchableOpacity onPress={() => onNavigate('MyGrievances')}>
            <Text style={[styles.seeAllText, { color: theme.secondary }]}>View All →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loadingText}>Fetching Live Grievance Queue...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={loadDashboardData}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : grievances.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>🎉 No active unresolved tickets in this queue!</Text>
          </View>
        ) : (
          grievances.map((item) => {
            const isOverdue = new Date(item.deadline) < new Date() && item.status !== 'Resolved';
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.grievanceCard}
                onPress={() => onNavigate('GrievanceDetail', { id: item._id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.ticketTitle}>{item.title}</Text>
                  <View style={[styles.prioBadge, item.priority === 'Critical' && styles.criticalBadge]}>
                    <Text style={styles.prioText}>{item.priority}</Text>
                  </View>
                </View>

                <Text style={styles.metaText}>📍 {item.location} • 🏷️ {item.category}</Text>

                {(item.citizenName || item.citizenId?.email || item.citizenEmail) && (
                  <View style={styles.citizenMetaRow}>
                    <Text style={styles.citizenNameText}>👤 {item.citizenName || 'Citizen'}</Text>
                    {(item.citizenId?.email || item.citizenEmail) && (
                      <Text style={styles.citizenEmailText} numberOfLines={1} ellipsizeMode="tail">
                        ({item.citizenId?.email || item.citizenEmail})
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.statusPill}>Status: {item.status}</Text>
                  <Text style={[styles.deadlineText, isOverdue && styles.overdueText]}>
                    ⏰ {isOverdue ? '⚠️ BREACHED' : new Date(item.deadline).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Mobile Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        {isCitizen && (
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('SubmitGrievance')}>
            <Text style={styles.navIcon}>➕</Text>
            <Text style={styles.navLabel}>Lodge</Text>
          </TouchableOpacity>
        )}
        {(isManager || isAdmin) && (
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('StaffDirectory')}>
            <Text style={styles.navIcon}>👥</Text>
            <Text style={styles.navLabel}>Staff</Text>
          </TouchableOpacity>
        )}
        {isAdmin && (
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('AuditLogs')}>
            <Text style={styles.navIcon}>📜</Text>
            <Text style={styles.navLabel}>Audit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('MyGrievances')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>{isOfficer ? 'My Tasks' : 'Tickets'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('Profile')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(203, 213, 225, 0.1)',
  },
  appTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#C9962C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleBadgeHeader: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 2,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C9962C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 18,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 90,
  },
  heroCard: {
    backgroundColor: 'rgba(201, 150, 44, 0.12)',
    borderColor: '#C9962C',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  heroBtn: {
    marginTop: 14,
    backgroundColor: '#C9962C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  heroActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#C9962C',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.08)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  seeAllText: {
    fontSize: 13,
    color: '#C9962C',
    fontWeight: '600',
  },
  loadingBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: 'rgba(192, 67, 59, 0.1)',
    borderColor: '#C0433B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#C0433B',
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#C9962C',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  grievanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  prioBadge: {
    backgroundColor: 'rgba(201, 150, 44, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  criticalBadge: {
    backgroundColor: 'rgba(192, 67, 59, 0.2)',
  },
  prioText: {
    color: '#C9962C',
    fontSize: 11,
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  citizenMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  citizenNameText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  citizenEmailText: {
    fontSize: 11,
    color: '#94A3B8',
    flexShrink: 1,
    maxWidth: 220,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.08)',
    paddingTop: 8,
  },
  statusPill: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  deadlineText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  overdueText: {
    color: '#C0433B',
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#C9962C',
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
