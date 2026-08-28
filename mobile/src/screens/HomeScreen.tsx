import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface HomeScreenProps {
  user: any;
  onNavigate: (screen: any, params?: any) => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onNavigate, onLogout }) => {
  const mockGrievances = [
    {
      id: 'g1',
      title: 'Contaminated Water Supply in Block 4',
      category: 'Water Supply',
      priority: 'Critical',
      status: 'In Progress',
      location: 'Sector 62, Block 4, Noida',
      deadline: 'Overdue (24h breach)',
    },
    {
      id: 'g2',
      title: 'Severe Street Light Failure on Main Road',
      category: 'Electricity',
      priority: 'High',
      status: 'Open',
      location: 'Main Arterial Road, Sector 62',
      deadline: 'In 2 Days',
    },
  ];

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
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Active Complaints</Text>
          </View>
          <View style={[styles.statTile, { borderLeftColor: '#4F9D6E' }]}>
            <Text style={[styles.statNumber, { color: '#4F9D6E' }]}>1</Text>
            <Text style={styles.statLabel}>Resolved Tickets</Text>
          </View>
        </View>

        {/* Duty Queue Widget */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 My Active Duty Queue</Text>
          <TouchableOpacity onPress={() => onNavigate('MyGrievances')}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {mockGrievances.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.grievanceCard}
            onPress={() => onNavigate('GrievanceDetail', { id: item.id })}
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
              <Text style={styles.deadlineText}>⏰ {item.deadline}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
