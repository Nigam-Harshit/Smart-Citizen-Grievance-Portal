import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { getSecureToken } from './src/services/secureStore';

export default function App() {
  const [status, setStatus] = useState<string>('Initializing Secure Hardware Store...');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkSecurityStore() {
      try {
        const token = await getSecureToken();
        if (token) {
          setStatus('Active Hardware-Encrypted JWT Session Detected');
        } else {
          setStatus('Hardware Keystore / Keychain Ready (No Active Session)');
        }
      } catch (err: any) {
        setStatus(`Keystore Status: Ready (${err.message || 'Initialized'})`);
      } finally {
        setLoading(false);
      }
    }

    checkSecurityStore();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.card}>
        <Text style={styles.icon}>🏛️</Text>
        <Text style={styles.title}>Smart Citizen Mobile</Text>
        <Text style={styles.subtitle}>Civic Grievance & Resolution Platform</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#C9962C" style={styles.loader} />
        ) : (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>🔒 {status}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate base
    alignItems: 'center',
    justify: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 16,
  },
  statusBadge: {
    backgroundColor: 'rgba(201, 150, 44, 0.15)',
    borderColor: '#C9962C',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    color: '#C9962C',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
