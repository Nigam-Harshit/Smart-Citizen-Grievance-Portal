import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface GrievanceDetailScreenProps {
  onNavigate: (screen: any, params?: any) => void;
  grievanceId?: string;
}

export const GrievanceDetailScreen: React.FC<GrievanceDetailScreenProps> = ({ onNavigate, grievanceId }) => {
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);

  const grievance = {
    id: grievanceId || 'g1',
    title: 'Contaminated Water Supply in Block 4',
    category: 'Water Supply',
    priority: 'Critical',
    status: 'In Progress',
    location: 'Sector 62, Block 4, Noida',
    description: 'Tap water coming with dark yellow discoloration and foul sewage odor since yesterday morning. Over 40 households affected in Block 4.',
    createdAt: '2026-08-27 09:30 AM',
    deadline: '2026-08-28 09:30 AM (24h SLA Target)',
    officer: 'Officer Rakesh Sharma (Water Supply Dept)',
  };

  const timelineLogs = [
    {
      id: 't1',
      author: 'Citizen Response (Rajesh Kumar)',
      date: '2026-08-27 09:30 AM',
      type: 'Initial Complaint Filed',
      notes: 'Submitted complaint with location coordinates and discolored water description.',
    },
    {
      id: 't2',
      author: 'System SLA Engine',
      date: '2026-08-27 09:31 AM',
      type: 'SLA Calculation',
      notes: 'Priority set to Critical (24h resolution SLA target applied).',
    },
    {
      id: 't3',
      author: 'Officer Rakesh Sharma',
      date: '2026-08-27 02:15 PM',
      type: 'Field Inspection Note',
      notes: 'Inspected main junction valve near Block 4 entrance. Pipeline leak identified, replacement crew dispatched.',
    },
  ];

  const handlePostNote = () => {
    if (!noteText.trim()) {
      Alert.alert('Empty Note', 'Please enter a note before submitting.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Response Posted', 'Your follow-up note has been added to the grievance timeline log.');
      setNoteText('');
    }, 600);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('MyGrievances')}>
          <Text style={styles.backBtn}>← Tickets</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grievance #{grievance.id.substring(0, 8)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ticket Header Specs Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{grievance.title}</Text>
            <View style={styles.criticalBadge}>
              <Text style={styles.prioText}>{grievance.priority}</Text>
            </View>
          </View>

          <Text style={styles.metaText}>📍 {grievance.location}</Text>
          <Text style={styles.metaText}>🏷️ Category: <Text style={{ color: '#F8FAFC' }}>{grievance.category}</Text></Text>
          <Text style={styles.metaText}>👮 Assigned: <Text style={{ color: '#C9962C', fontWeight: 'bold' }}>{grievance.officer}</Text></Text>

          <View style={styles.slaBanner}>
            <Text style={styles.slaText}>⏰ Target Deadline: {grievance.deadline}</Text>
          </View>

          <Text style={styles.sectionHeader}>Full Problem Description:</Text>
          <Text style={styles.descriptionText}>{grievance.description}</Text>
        </View>

        {/* 4-Step Resolution Lifecyle Stepper */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Resolution Lifecycle Stepper:</Text>
          <View style={styles.stepperRow}>
            <View style={[styles.stepDot, styles.stepDone]}>
              <Text style={styles.stepNum}>✓</Text>
            </View>
            <View style={[styles.stepLine, styles.lineDone]} />
            <View style={[styles.stepDot, styles.stepDone]}>
              <Text style={styles.stepNum}>✓</Text>
            </View>
            <View style={[styles.stepLine, styles.lineDone]} />
            <View style={[styles.stepDot, styles.stepActive]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepDot}>
              <Text style={styles.stepNum}>4</Text>
            </View>
          </View>
          <View style={styles.stepperLabels}>
            <Text style={styles.stepLabel}>Submitted</Text>
            <Text style={styles.stepLabel}>Review</Text>
            <Text style={[styles.stepLabel, { color: '#C9962C', fontWeight: 'bold' }]}>Inspection</Text>
            <Text style={styles.stepLabel}>Resolved</Text>
          </View>
        </View>

        {/* Timeline Log History */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>💬 Grievance Timeline Log ({timelineLogs.length})</Text>

          {timelineLogs.map((log) => (
            <View key={log.id} style={styles.logBox}>
              <View style={styles.logHeader}>
                <Text style={styles.logAuthor}>{log.author}</Text>
                <Text style={styles.logDate}>{log.date}</Text>
              </View>
              <Text style={styles.logType}>Type: {log.type}</Text>
              <Text style={styles.logNotes}>{log.notes}</Text>
            </View>
          ))}
        </View>

        {/* Post Citizen Timeline Response Form */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>✏️ Add Citizen Follow-up Note</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Type follow-up update or additional details for field officer..."
            placeholderTextColor="#64748B"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.postBtn, loading && styles.btnDisabled]}
            onPress={handlePostNote}
            disabled={loading}
          >
            <Text style={styles.postBtnText}>{loading ? 'Posting...' : 'Post Timeline Update'}</Text>
          </TouchableOpacity>
        </View>
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginRight: 8,
  },
  criticalBadge: {
    backgroundColor: 'rgba(192, 67, 59, 0.2)',
    borderColor: '#C0433B',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prioText: {
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  slaBanner: {
    backgroundColor: 'rgba(192, 67, 59, 0.15)',
    borderColor: '#C0433B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 12,
  },
  slaText: {
    color: '#C0433B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: '#4F9D6E',
    borderColor: '#4F9D6E',
  },
  stepActive: {
    backgroundColor: '#C9962C',
    borderColor: '#C9962C',
  },
  stepNum: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#334155',
  },
  lineDone: {
    backgroundColor: '#4F9D6E',
  },
  stepperLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 10,
    color: '#94A3B8',
    width: 65,
    textAlign: 'center',
  },
  logBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderColor: 'rgba(203, 213, 225, 0.1)',
    borderWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#C9962C',
  },
  logDate: {
    fontSize: 10,
    color: '#64748B',
  },
  logType: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  logNotes: {
    fontSize: 12,
    color: '#F8FAFC',
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F8FAFC',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  postBtn: {
    backgroundColor: '#C9962C',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  postBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
