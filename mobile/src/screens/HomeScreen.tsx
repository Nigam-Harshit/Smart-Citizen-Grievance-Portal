import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchDutyQueue } from '../services/grievanceService';

interface HomeScreenProps {
  user: any;
  onNavigate: (screen: any, params?: any) => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onNavigate, onLogout }) => {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [resolvedCount, setResolvedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchDutyQueue();
      if (res.data) {
        const myGrievances = res.data.myGrievances || [];
        setGrievances(myGrievances);
        setActiveCount(res.data.myCount || myGrievances.length);
        setResolvedCount(res.data.resolvedCount || 0);
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
        <View>
          <Text style={styles.appTitle}>🏛️ Smart Citizen</Text>
          <Text style={styles.welcomeText}>Hello, {user?.name || 'Citizen'}</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={() => onNavigate('Profile')}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Action Hero Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Lodge a Public Grievance</Text>
          <Text style={styles.heroSub}>Report sanitation, water, road, or safety issues directly to zonal municipal officers.</Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => onNavigate('SubmitGrievance')}>
            <Text style={styles.heroBtnText}>➕ Lodge New Grievance</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statNumber}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active Complaints</Text>
          </View>
          <View style={[styles.statTile, { borderLeftColor: '#4F9D6E' }]}>
            <Text style={[styles.statNumber, { color: '#4F9D6E' }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved Tickets</Text>
          </View>
        </View>

        {/* Duty Queue Widget Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 My Active Duty Queue</Text>
          <TouchableOpacity onPress={() => onNavigate('MyGrievances')}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#C9962C" />
            <Text style={styles.loadingText}>Fetching Live Grievance Queue...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadDashboardData}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : grievances.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>🎉 No active unresolved tickets in your queue!</Text>
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
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('SubmitGrievance')}>
          <Text style={styles.navIcon}>➕</Text>
          <Text style={styles.navLabel}>Lodge</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('MyGrievances')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Tickets</Text>
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
    marginBottom: 16,
  },
  heroBtn: {
    backgroundColor: '#C9962C',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#C9962C',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#C9962C',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  seeAllText: {
    fontSize: 13,
    color: '#C9962C',
    fontWeight: 'bold',
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  errorBox: {
    padding: 16,
    backgroundColor: 'rgba(192, 67, 59, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#C0433B',
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C0433B',
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  grievanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginRight: 8,
  },
  prioBadge: {
    backgroundColor: 'rgba(74, 127, 191, 0.2)',
    borderColor: '#4A7FBF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  criticalBadge: {
    backgroundColor: 'rgba(192, 67, 59, 0.2)',
    borderColor: '#C0433B',
  },
  prioText: {
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.08)',
    paddingTop: 10,
  },
  statusPill: {
    fontSize: 12,
    color: '#C9962C',
    fontWeight: 'bold',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.15)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  activeNavLabel: {
    color: '#C9962C',
    fontWeight: 'bold',
  },
});
