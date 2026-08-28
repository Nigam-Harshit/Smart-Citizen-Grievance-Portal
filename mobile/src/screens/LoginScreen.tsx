import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface LoginScreenProps {
  onNavigate: (screen: any) => void;
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter your email address and password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        _id: 'mock_user_123',
        name: 'Rajesh Kumar',
        email,
        role: 'citizen',
        phone: '+91 98100 12345',
      });
      onNavigate('Home');
    }, 800);
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.icon}>🏛️</Text>
          <Text style={styles.title}>Sign In to Portal</Text>
          <Text style={styles.subtitle}>Enter registered citizen credentials</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="rajesh@example.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Signing In...' : '🔑 Sign In'}</Text>
        </TouchableOpacity>

        {/* Demo Quick Fill Buttons */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Sign In:</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity style={styles.demoChip} onPress={() => handleQuickDemo('citizen.rajesh@gmail.com')}>
              <Text style={styles.demoChipText}>🏡 Citizen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.demoChip} onPress={() => handleQuickDemo('officer.sharma@grievance.gov.in')}>
              <Text style={styles.demoChipText}>👮 Officer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.demoChip} onPress={() => handleQuickDemo('manager@grievance.gov.in')}>
              <Text style={styles.demoChipText}>📊 Manager</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New Citizen? </Text>
          <TouchableOpacity onPress={() => onNavigate('Register')}>
            <Text style={styles.linkText}>Create 3-Step Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 42,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
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
  primaryBtn: {
    backgroundColor: '#C9962C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.1)',
  },
  demoTitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  demoChip: {
    flex: 1,
    backgroundColor: 'rgba(201, 150, 44, 0.12)',
    borderColor: '#C9962C',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  demoChipText: {
    color: '#C9962C',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  linkText: {
    color: '#C9962C',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
