import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { updateProfileInfo, logoutCitizen } from '../services/authService';
import { getRoleTheme } from '../theme/roleTheme';

interface ProfileScreenProps {
  user: any;
  onNavigate: (screen: any, params?: any) => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onNavigate, onLogout }) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);

  const role = user?.role || 'citizen';
  const roleTheme = getRoleTheme(role);
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const res = await updateProfileInfo({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      setLoading(false);

      if (res.error) {
        Alert.alert('Update Failed', res.error);
        return;
      }

      Alert.alert('Profile Saved', 'Your account settings have been updated successfully.');
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Network Error', err.message || 'Failed to update profile.');
    }
  };

  const handleSignOut = async () => {
    await logoutCitizen();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('Home')}>
          <Text style={styles.backBtn}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={[styles.avatarCircle, { backgroundColor: roleTheme.primary }]}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
          <Text style={styles.userName}>{name || roleTheme.roleLabel}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@grievance.gov.in'}</Text>

          <View
            style={[
              styles.roleBadge,
              { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder },
            ]}
          >
            <Text style={[styles.roleText, { color: roleTheme.badgeText }]}>
              {roleTheme.icon} {roleTheme.roleLabel}
            </Text>
          </View>

          {user?.scope && (
            <Text style={styles.scopeText}>
              Department Scope: <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>{user.scope}</Text>
            </Text>
          )}
        </View>

        {/* Administrative Navigation Card for Admin & Manager */}
        {(isAdmin || isManager) && (
          <View style={[styles.card, { borderColor: roleTheme.badgeBorder, borderWidth: 1.5 }]}>
            <Text style={[styles.sectionHeader, { color: roleTheme.secondary }]}>
              {isAdmin ? '👑 Administrator Controls' : '📊 Manager Controls'}
            </Text>

            <TouchableOpacity
              style={[styles.adminActionBtn, { backgroundColor: roleTheme.primary }]}
              onPress={() => onNavigate('StaffDirectory')}
            >
              <Text style={styles.adminActionBtnText}>👥 Staff & Officer Directory</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                style={[styles.adminActionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: roleTheme.secondary, marginTop: 10 }]}
                onPress={() => onNavigate('AuditLogs')}
              >
                <Text style={[styles.adminActionBtnText, { color: roleTheme.secondary }]}>📜 System Audit Trail Logs</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Profile Settings Form */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Edit Account Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address (Read-only)</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98100 12345"
              placeholderTextColor="#64748B"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Residential Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your street address, apartment number, sector..."
              placeholderTextColor="#64748B"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Saving...' : '💾 Save Profile Updates'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Card */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>🚪 Sign Out of Portal</Text>
        </TouchableOpacity>
      </ScrollView>
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C9962C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(201, 150, 44, 0.15)',
    borderColor: '#C9962C',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 11,
    color: '#C9962C',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: '#182234',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#C9962C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
  scopeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  adminActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  adminActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: 'rgba(192, 67, 59, 0.15)',
    borderColor: '#C0433B',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  logoutBtnText: {
    color: '#C0433B',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
