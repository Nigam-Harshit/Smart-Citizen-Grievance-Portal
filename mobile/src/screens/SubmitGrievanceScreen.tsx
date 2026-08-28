import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { postGrievance } from '../services/grievanceService';
import { updateProfileInfo } from '../services/authService';

interface SubmitGrievanceScreenProps {
  user: any;
  onNavigate: (screen: any, params?: any) => void;
}

export const SubmitGrievanceScreen: React.FC<SubmitGrievanceScreenProps> = ({ user, onNavigate }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sanitation');
  const [priority, setPriority] = useState('Medium');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const categories = ['Sanitation', 'Water Supply', 'Roads', 'Electricity', 'Public Safety'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const handleSubmit = async () => {
    if (!title || !location || !description) {
      Alert.alert('Required Fields', 'Please fill in title, landmark location, and description.');
      return;
    }

    if (!user?.phone && !phone.trim()) {
      Alert.alert('Contact Phone Required', 'Please enter your contact phone number for field officer dispatch.');
      return;
    }

    setLoading(true);
    try {
      if (!user?.phone && phone.trim()) {
        await updateProfileInfo({ phone: phone.trim() });
      }

      const res = await postGrievance({
        title,
        category,
        priority,
        location,
        description,
      });

      setLoading(false);

      if (res.error) {
        Alert.alert('Submission Failed', res.error);
        return;
      }

      Alert.alert('Grievance Lodged', `Your complaint #${res.data?._id?.substring(18) || ''} has been lodged successfully!`);
      onNavigate('MyGrievances');
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Network Error', err.message || 'Failed to submit complaint to portal server.');
    }
  };

  const isPhoneMissing = !user?.phone && !phone;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('Home')}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lodge Grievance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isPhoneMissing && (
          <View style={styles.phoneBanner}>
            <Text style={styles.phoneBannerText}>
              📌 Contact Phone Required: Please enter your phone number below so field officers can contact you during site inspection.
            </Text>
          </View>
        )}

        {isPhoneMissing && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98100 12345"
              placeholderTextColor="#64748B"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Grievance Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Burst water pipeline flooding Sector 15 road"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Municipal Category *</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority Level *</Text>
          <View style={styles.chipGrid}>
            {priorities.map((prio) => (
              <TouchableOpacity
                key={prio}
                style={[styles.chip, priority === prio && styles.chipActive]}
                onPress={() => setPriority(prio)}
              >
                <Text style={[styles.chipText, priority === prio && styles.chipTextActive]}>{prio}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Landmark Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Opposite Sector 15 Market Gate 2"
            placeholderTextColor="#64748B"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Problem Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the complaint in detail, time observed, hazards..."
            placeholderTextColor="#64748B"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : '📝 Lodge Official Grievance'}</Text>
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
  },
  phoneBanner: {
    backgroundColor: 'rgba(201, 150, 44, 0.15)',
    borderColor: '#C9962C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  phoneBannerText: {
    color: '#C9962C',
    fontSize: 12,
    lineHeight: 16,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(201, 150, 44, 0.2)',
    borderColor: '#C9962C',
  },
  chipText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#C9962C',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#C9962C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
