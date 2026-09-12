import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchStaffUsers, StaffUser } from '../services/adminService';
import { getRoleTheme } from '../theme/roleTheme';

interface StaffDirectoryScreenProps {
  user?: any;
  onNavigate: (screen: any, params?: any) => void;
}

export const StaffDirectoryScreen: React.FC<StaffDirectoryScreenProps> = ({ user, onNavigate }) => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAuthorized = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (isAuthorized) {
      loadStaff();
    }
  }, [isAuthorized]);

  const loadStaff = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchStaffUsers();
      if (res.data && Array.isArray(res.data)) {
        setStaff(res.data);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch staff roster.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.scope && s.scope.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole =
      roleFilter === 'All' ||
      (roleFilter === 'Officer' && (s.role === 'officer' || s.role === 'field_officer')) ||
      (roleFilter === 'Manager' && s.role === 'manager') ||
      (roleFilter === 'Admin' && s.role === 'admin');
    return matchesSearch && matchesRole;
  });

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => onNavigate('Home')}>
            <Text style={styles.backBtn}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>🔒 Staff Directory is restricted to Civic Managers and System Administrators.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('Home')}>
          <Text style={styles.backBtn}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff & Officer Directory</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search and Role Filter */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or department..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.tabRow}>
          {['All', 'Officer', 'Manager', 'Admin'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, roleFilter === tab && styles.tabActive]}
              onPress={() => setRoleFilter(tab)}
            >
              <Text style={[styles.tabText, roleFilter === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Staff List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Fetching Staff Roster...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadStaff}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredStaff.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No staff members match the selected criteria.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const roleTheme = getRoleTheme(item.role);
            return (
              <View style={styles.staffCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <Text style={styles.staffEmail}>✉️ {item.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder },
                    ]}
                  >
                    <Text style={[styles.roleBadgeText, { color: roleTheme.badgeText }]}>
                      {roleTheme.icon} {roleTheme.roleLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>
                    🏢 Department Scope: <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>{item.scope || 'All Categories'}</Text>
                  </Text>
                  {item.phone && (
                    <Text style={styles.metaText}>
                      📞 Phone: <Text style={{ color: '#94A3B8' }}>{item.phone}</Text>
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
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
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  filterSection: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(203, 213, 225, 0.08)',
  },
  searchInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.1)',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  staffCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  staffName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  staffEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.08)',
    paddingTop: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

