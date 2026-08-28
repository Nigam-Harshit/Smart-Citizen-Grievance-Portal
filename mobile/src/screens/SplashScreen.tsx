import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface SplashScreenProps {
  onNavigate: (screen: any) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onNavigate }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNavigate('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [onNavigate]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.brandBox}>
        <Text style={styles.logoIcon}>🏛️</Text>
        <Text style={styles.brandTitle}>Smart Citizen</Text>
        <Text style={styles.brandSubtitle}>Municipal Grievance Platform</Text>
        <ActivityIndicator size="large" color="#C9962C" style={styles.loader} />
        <Text style={styles.loadingText}>Initializing Secure Keychain...</Text>
      </View>

      <TouchableOpacity style={styles.skipBtn} onPress={() => onNavigate('Login')}>
        <Text style={styles.skipText}>Tap to Continue →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    padding: 32,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
  },
  logoIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 24,
  },
  loader: {
    marginVertical: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#C9962C',
    fontWeight: 'bold',
  },
  skipBtn: {
    position: 'absolute',
    bottom: 40,
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 13,
  },
});
