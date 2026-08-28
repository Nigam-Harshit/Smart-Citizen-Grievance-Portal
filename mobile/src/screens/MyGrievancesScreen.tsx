import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface MyGrievancesScreenProps {
  onNavigate: (screen: any, params?: any) => void;
}

export const MyGrievancesScreen: React.FC<MyGrievancesScreenProps> = ({ onNavigate }) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const mockList = [
    {
      id: 'g1',
      title: 'Contaminated Water Supply in Block 4',
      category: 'Water Supply',
      priority: 'Critical',
      status: 'In Progress',
      location: 'Sector 62, Block 4, Noida',
      createdAt: '2026-08-27',
      deadline: '2026-08-28',
      officer: 'Officer Rakesh Sharma',
    },
    {
      id: 'g2',
      title: 'Severe Street Light Failure on Main Road',
      category: 'Electricity',
      priority: 'High',
      status: 'Open',
      location: 'Main Arterial Road, Sector 62',
      createdAt: '2026-08-26',
      deadline: '2026-08-29',
      officer: 'Unassigned',
    },
    {
      id: 'g3',
      title: 'Garbage Dump Overflow Near Park Gate',
      category: 'Sanitation',
      priority: 'Medium',
      status: 'Resolved',
      location: 'Sector 15 Community Park',
      createdAt: '2026-08-20',
      deadline: '2026-08-27',
      officer: 'Officer Priya Verma',
    },
  ];

  const filteredList = mockList.filter((g) => {
    if (filterStatus === 'All') return true;
    return g.status === filterStatus;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('Home')}>
          <Text style={styles.backBtn}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Grievances</Text>
        <TouchableOpacity onPress={() => onNavigate('SubmitGrievance')}>
          <Text style={styles.addBtn}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {['All', 'Open', 'In Progress', 'Resolved'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filterStatus === tab && styles.tabActive]}
            onPress={() => setFilterStatus(tab)}
          >
            <Text style={[styles.tabText, filterStatus === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Complaints List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onNavigate('GrievanceDetail', { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.prioBadge, item.priority === 'Critical' && styles.criticalBadge]}>
                <Text style={styles.prioText}>{item.priority}</Text>
              </View>
            </View>

            <Text style={styles.meta}>📍 {item.location} • 🏷️ {item.category}</Text>
            <Text style={styles.officerText}>👮 Assigned: {item.officer}</Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.statusPill, item.status === 'Resolved' && styles.statusResolved]}>
                Status: {item.status}
              </Text>
              <Text style={styles.dateText}>Filed: {item.createdAt}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
  backBtn: {
    color: '#C9962C',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  addBtn: {
    color: '#C9962C',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  tabActive: {
    backgroundColor: '#C9962C',
  },
  tabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
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
    borderRadius: 6,
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
  meta: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  officerText: {
    fontSize: 12,
    color: '#F8FAFC',
    marginBottom: 10,
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
    color: '#C9962C',
    fontWeight: 'bold',
  },
  statusResolved: {
    color: '#4F9D6E',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
});
