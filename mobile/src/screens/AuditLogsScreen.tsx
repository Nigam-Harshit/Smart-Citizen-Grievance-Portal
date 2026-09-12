import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchAuditLogs, AuditLogItem } from '../services/adminService';
import { getRoleTheme } from '../theme/roleTheme';

interface AuditLogsScreenProps {
  user?: any;
  onNavigate: (screen: any, params?: any) => void;
}

export const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({ user, onNavigate }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin]);

  const loadLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAuditLogs();
      if (res.data && Array.isArray(res.data)) {
        setLogs(res.data);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch audit log trail.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => onNavigate('Home')}>
            <Text style={styles.backBtn}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Restricted</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>🔒 System Audit Logs are strictly restricted to System Administrators.</Text>
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
        <Text style={styles.headerTitle}>System Audit Trail</Text>
        <TouchableOpacity onPress={loadLogs}>
          <Text style={styles.refreshBtn}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Audit Log Entries List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={styles.loadingText}>Fetching System Audit Trail...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadLogs}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No audit entries recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const actorName = item.userId?.name || 'System';
            const actorRole = item.userId?.role || 'system';
            const roleTheme = getRoleTheme(actorRole);

            return (
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.actorRow}>
                    <Text style={styles.actorName}>{actorName}</Text>
                    {item.userId?.role && (
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder },
                        ]}
                      >
                        <Text style={[styles.roleBadgeText, { color: roleTheme.badgeText }]}>
                          {roleTheme.roleLabel}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>

                <View style={styles.actionRow}>
                  <Text style={styles.actionPill}>⚙️ {item.action}</Text>
                </View>

                <Text style={styles.detailsText}>{item.details}</Text>
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
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  refreshBtn: {
    color: '#8B5CF6',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  logCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.1)',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  actionRow: {
    marginBottom: 6,
  },
  actionPill: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A78BFA',
  },
  detailsText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
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
    backgroundColor: '#8B5CF6',
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

