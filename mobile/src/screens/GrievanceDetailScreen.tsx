import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchGrievanceById, fetchTimelineUpdates, postTimelineUpdate } from '../services/grievanceService';

interface GrievanceDetailScreenProps {
  onNavigate: (screen: any, params?: any) => void;
  grievanceId?: string;
}

export const GrievanceDetailScreen: React.FC<GrievanceDetailScreenProps> = ({ onNavigate, grievanceId }) => {
  const [grievance, setGrievance] = useState<any | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [noteText, setNoteText] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (grievanceId) {
      loadGrievanceDetails();
    }
  }, [grievanceId]);

  const loadGrievanceDetails = async () => {
    if (!grievanceId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [gRes, logsRes] = await Promise.all([
        fetchGrievanceById(grievanceId),
        fetchTimelineUpdates(grievanceId),
      ]);

      if (gRes.data && gRes.data._id) {
        setGrievance(gRes.data);
      } else if (gRes.error) {
        setErrorMsg(gRes.error);
      }

      if (logsRes.data && Array.isArray(logsRes.data)) {
        setTimelineLogs(logsRes.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch complaint details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostNote = async () => {
    if (!noteText.trim() || !grievanceId) {
      Alert.alert('Empty Note', 'Please enter a note before submitting.');
      return;
    }

    setSubmittingNote(true);
    try {
      const res = await postTimelineUpdate(grievanceId, noteText.trim());
      setSubmittingNote(false);

      if (res.error) {
        Alert.alert('Post Failed', res.error);
        return;
      }

      Alert.alert('Response Posted', 'Your note has been added to the official timeline log.');
      setNoteText('');
      loadGrievanceDetails();
    } catch (err: any) {
      setSubmittingNote(false);
      Alert.alert('Network Error', err.message || 'Failed to post timeline update.');
    }
  };

  const getStepStatus = (status: string) => {
    if (status === 'Resolved') return 4;
    if (status === 'In Progress') return 3;
    return 2;
  };

  const stepLevel = grievance ? getStepStatus(grievance.status) : 1;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNavigate('MyGrievances')}>
          <Text style={styles.backBtn}>← Tickets</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grievance #{grievanceId ? grievanceId.substring(18) : ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C9962C" />
          <Text style={styles.loadingText}>Fetching Complaint Details & Timeline...</Text>
        </View>
      ) : errorMsg || !grievance ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg || 'Complaint details not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadGrievanceDetails}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Ticket Header Specs Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{grievance.title}</Text>
              <View style={[styles.prioBadge, grievance.priority === 'Critical' && styles.criticalBadge]}>
                <Text style={styles.prioText}>{grievance.priority}</Text>
              </View>
            </View>

            <Text style={styles.metaText}>📍 {grievance.location}</Text>
            <Text style={styles.metaText}>🏷️ Category: <Text style={{ color: '#F8FAFC' }}>{grievance.category}</Text></Text>
            <Text style={styles.metaText}>
              👮 Assigned: <Text style={{ color: '#C9962C', fontWeight: 'bold' }}>{grievance.assignedTo?.name || grievance.officerName || 'Unassigned'}</Text>
            </Text>

            <View style={styles.slaBanner}>
              <Text style={styles.slaText}>⏰ Target Deadline: {new Date(grievance.deadline).toLocaleString()}</Text>
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
              <View style={[styles.stepDot, stepLevel >= 2 ? styles.stepDone : styles.stepActive]}>
                <Text style={styles.stepNum}>{stepLevel >= 2 ? '✓' : '2'}</Text>
              </View>
              <View style={[styles.stepLine, stepLevel >= 3 && styles.lineDone]} />
              <View style={[styles.stepDot, stepLevel >= 3 ? (stepLevel === 3 ? styles.stepActive : styles.stepDone) : null]}>
                <Text style={styles.stepNum}>{stepLevel >= 3 ? (stepLevel === 3 ? '3' : '✓') : '3'}</Text>
              </View>
              <View style={[styles.stepLine, stepLevel >= 4 && styles.lineDone]} />
              <View style={[styles.stepDot, stepLevel >= 4 && styles.stepDone]}>
                <Text style={styles.stepNum}>{stepLevel >= 4 ? '✓' : '4'}</Text>
              </View>
            </View>
            <View style={styles.stepperLabels}>
              <Text style={styles.stepLabel}>Submitted</Text>
              <Text style={styles.stepLabel}>Under Review</Text>
              <Text style={[styles.stepLabel, stepLevel === 3 && { color: '#C9962C', fontWeight: 'bold' }]}>Inspection</Text>
              <Text style={[styles.stepLabel, stepLevel === 4 && { color: '#4F9D6E', fontWeight: 'bold' }]}>Resolved</Text>
            </View>
          </View>

          {/* Timeline Log History */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>💬 Grievance Timeline Log ({timelineLogs.length})</Text>

            {timelineLogs.length === 0 ? (
              <Text style={styles.emptyLogText}>No timeline notes recorded yet.</Text>
            ) : (
              timelineLogs.map((log) => (
                <View key={log._id} style={styles.logBox}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logAuthor}>{log.createdBy?.name || log.authorName || 'System'}</Text>
                    <Text style={styles.logDate}>{new Date(log.createdAt).toLocaleString()}</Text>
                  </View>
                  <Text style={styles.logType}>Type: {log.type}</Text>
                  <Text style={styles.logNotes}>{log.notes}</Text>
                </View>
              ))
            )}
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
              style={[styles.postBtn, submittingNote && styles.btnDisabled]}
              onPress={handlePostNote}
              disabled={submittingNote}
            >
              <Text style={styles.postBtnText}>{submittingNote ? 'Posting...' : 'Post Timeline Update'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    color: '#C9962C',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
  },
  errorText: {
    color: '#C0433B',
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#C0433B',
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  prioBadge: {
    backgroundColor: 'rgba(74, 127, 191, 0.2)',
    borderColor: '#4A7FBF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  emptyLogText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
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
