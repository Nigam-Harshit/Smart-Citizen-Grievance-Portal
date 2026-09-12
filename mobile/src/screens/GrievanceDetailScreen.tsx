import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  fetchGrievanceById,
  fetchTimelineUpdates,
  postTimelineUpdate,
  updateGrievanceStatus,
  fetchOfficers,
  assignGrievanceOfficer,
} from '../services/grievanceService';
import { getRoleTheme } from '../theme/roleTheme';

interface GrievanceDetailScreenProps {
  user?: any;
  onNavigate: (screen: any, params?: any) => void;
  grievanceId?: string;
  fromScreen?: string;
}

export const GrievanceDetailScreen: React.FC<GrievanceDetailScreenProps> = ({
  user,
  onNavigate,
  grievanceId,
  fromScreen,
}) => {
  const [grievance, setGrievance] = useState<any | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [noteText, setNoteText] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [officers, setOfficers] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);

  useEffect(() => {
    if (grievanceId) {
      loadGrievanceDetails();
    }
  }, [grievanceId]);

  const isOfficerRole = user?.role === 'officer' || user?.role === 'field_officer';
  const isManagerRole = user?.role === 'manager';
  const isAdminRole = user?.role === 'admin';
  const canAssignOfficer = isManagerRole || isAdminRole;

  useEffect(() => {
    if (canAssignOfficer) {
      loadOfficersList();
    }
  }, [canAssignOfficer]);

  const loadOfficersList = async () => {
    try {
      const res = await fetchOfficers();
      if (res.data && Array.isArray(res.data)) {
        setOfficers(res.data);
      }
    } catch (err) {
      console.error('Error fetching officers:', err);
    }
  };

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

  const assignedOfficerId = grievance?.assignedTo?._id || grievance?.assignedTo;
  const isAssignedToMe = isOfficerRole && assignedOfficerId && (String(assignedOfficerId) === String(user?._id));

  const handleStatusUpdate = (newStatus: 'In Progress' | 'Resolved') => {
    if (!grievanceId || updatingStatus) return;

    Alert.alert(
      newStatus === 'In Progress' ? 'Start Inspection?' : 'Resolve Grievance?',
      newStatus === 'In Progress'
        ? 'Begin field inspection and mark this grievance as "In Progress"?'
        : 'Confirm that on-site verification is complete and issue is resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              const res = await updateGrievanceStatus(grievanceId, newStatus);
              setUpdatingStatus(false);

              if (res.error) {
                Alert.alert('Status Update Failed', res.error);
                return;
              }

              Alert.alert('Status Updated', `Grievance has been marked as "${newStatus}".`);
              loadGrievanceDetails();
            } catch (err: any) {
              setUpdatingStatus(false);
              Alert.alert('Network Error', err.message || 'Failed to update status.');
            }
          },
        },
      ]
    );
  };

  const handleAssignOfficer = (officer: any) => {
    if (!grievanceId || assigning) return;

    Alert.alert(
      'Confirm Officer Assignment',
      `Assign this grievance to Field Officer ${officer.name} (${officer.scope || 'General'})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Assign',
          onPress: async () => {
            setAssigning(true);
            try {
              const res = await assignGrievanceOfficer(grievanceId, officer._id);
              setAssigning(false);

              if (res.error) {
                Alert.alert('Assignment Failed', res.error);
                return;
              }

              Alert.alert('Officer Assigned', `Grievance successfully assigned to ${officer.name}.`);
              setShowAssignModal(false);
              loadGrievanceDetails();
            } catch (err: any) {
              setAssigning(false);
              Alert.alert('Network Error', err.message || 'Failed to assign officer.');
            }
          },
        },
      ]
    );
  };

  const handlePostNote = async () => {
    if (!noteText.trim() || !grievanceId) {
      Alert.alert('Empty Note', 'Please enter a note before submitting.');
      return;
    }

    setSubmittingNote(true);
    try {
      const noteType = isOfficerRole
        ? 'Officer Field Note'
        : canAssignOfficer
        ? 'Officer Field Note'
        : 'Citizen Response';
      const res = await postTimelineUpdate(grievanceId, noteText.trim(), noteType);
      setSubmittingNote(false);

      if (res.error) {
        Alert.alert('Post Failed', res.error);
        return;
      }

      Alert.alert(
        'Note Recorded',
        isOfficerRole
          ? 'Officer Field Note posted to timeline.'
          : canAssignOfficer
          ? 'Manager / Staff review note posted to timeline.'
          : 'Your note has been added to the official timeline log.'
      );
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
        <TouchableOpacity onPress={() => onNavigate(fromScreen || 'MyGrievances')}>
          <Text style={styles.backBtn}>← {fromScreen === 'Home' ? 'Home' : 'Tickets'}</Text>
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

          {/* Officer Action Card (Only visible to assigned officer) */}
          {isAssignedToMe && (
            <View style={[styles.card, { borderColor: '#3B82F6', borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.sectionHeader, { color: '#60A5FA', marginVertical: 0 }]}>👮 Officer Field Actions</Text>
                <View style={[styles.prioBadge, { backgroundColor: grievance.status === 'Resolved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)' }]}>
                  <Text style={[styles.prioText, { color: grievance.status === 'Resolved' ? '#34D399' : '#60A5FA' }]}>
                    {grievance.status}
                  </Text>
                </View>
              </View>

              {grievance.status === 'Open' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#C9962C' }, updatingStatus && styles.btnDisabled]}
                  onPress={() => handleStatusUpdate('In Progress')}
                  disabled={updatingStatus}
                >
                  <Text style={styles.actionBtnText}>
                    {updatingStatus ? 'Updating Status...' : '🛠️ Start Inspection'}
                  </Text>
                </TouchableOpacity>
              )}

              {grievance.status === 'In Progress' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }, updatingStatus && styles.btnDisabled]}
                  onPress={() => handleStatusUpdate('Resolved')}
                  disabled={updatingStatus}
                >
                  <Text style={styles.actionBtnText}>
                    {updatingStatus ? 'Updating Status...' : '✅ Resolve Grievance'}
                  </Text>
                </TouchableOpacity>
              )}

              {grievance.status === 'Resolved' && (
                <View style={[styles.slaBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981', marginTop: 6 }]}>
                  <Text style={[styles.slaText, { color: '#10B981' }]}>
                    ✓ On-site verification complete. Grievance officially resolved.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Manager / Admin Officer Assignment Card */}
          {canAssignOfficer && (
            <View style={[styles.card, { borderColor: '#10B981', borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.sectionHeader, { color: '#34D399', marginVertical: 0 }]}>👮 Officer Assignment</Text>
                <View style={[styles.prioBadge, { backgroundColor: grievance.assignedTo ? 'rgba(16, 185, 129, 0.2)' : 'rgba(201, 150, 44, 0.2)' }]}>
                  <Text style={[styles.prioText, { color: grievance.assignedTo ? '#34D399' : '#C9962C' }]}>
                    {grievance.assignedTo ? 'Assigned' : 'Unassigned'}
                  </Text>
                </View>
              </View>

              <Text style={styles.metaText}>
                Assigned Officer: <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                  {grievance.assignedTo?.name || 'Unassigned (Pending Dispatch)'}
                </Text>
              </Text>
              {grievance.assignedTo?.email && (
                <Text style={styles.metaText}>
                  Contact: <Text style={{ color: '#94A3B8' }}>{grievance.assignedTo.email}</Text>
                </Text>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981', marginTop: 10 }]}
                onPress={() => setShowAssignModal(true)}
              >
                <Text style={styles.actionBtnText}>
                  📋 {grievance.assignedTo ? 'Reassign Field Officer' : 'Assign Field Officer'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
              timelineLogs.map((log) => {
                const authorName = log.userId?.name || log.createdBy?.name || log.authorName || 'System';
                const authorRole = log.userId?.role || (log.type?.includes('Officer') ? 'officer' : log.type?.includes('Citizen') ? 'citizen' : null);
                const roleTheme = getRoleTheme(authorRole || 'citizen');
                return (
                  <View key={log._id} style={styles.logBox}>
                    <View style={styles.logHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.logAuthor}>{authorName}</Text>
                        {authorRole && (
                          <View style={[styles.inlineBadge, { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder }]}>
                            <Text style={[styles.inlineBadgeText, { color: roleTheme.badgeText }]}>
                              {roleTheme.roleLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.logDate}>{new Date(log.createdAt).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.logType}>Type: {log.type}</Text>
                    <Text style={styles.logNotes}>{log.notes}</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Post Timeline Note Form */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>
              {isOfficerRole
                ? '📝 Add Field Inspection Note'
                : canAssignOfficer
                ? '📋 Add Administrative / Review Note'
                : '✏️ Add Citizen Follow-up Note'}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={
                isOfficerRole
                  ? 'Type official field inspection notes or verification findings...'
                  : canAssignOfficer
                  ? 'Type official managerial review notes or instructions...'
                  : 'Type follow-up update or additional details for field officer...'
              }
              placeholderTextColor="#64748B"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.postBtn, (submittingNote || !noteText.trim()) && styles.btnDisabled]}
              onPress={handlePostNote}
              disabled={submittingNote || !noteText.trim()}
            >
              <Text style={styles.postBtnText}>
                {submittingNote
                  ? 'Posting...'
                  : isOfficerRole
                  ? '📌 Post Field Note'
                  : canAssignOfficer
                  ? '📌 Post Review Note'
                  : 'Post Timeline Update'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Officer Assignment Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Field Officer</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Select active officer from roster:</Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {officers.length === 0 ? (
                <Text style={styles.emptyLogText}>No field officers found in roster.</Text>
              ) : (
                officers.map((off) => {
                  const isCurrent = String(grievance?.assignedTo?._id || grievance?.assignedTo) === String(off._id);
                  return (
                    <TouchableOpacity
                      key={off._id}
                      style={[styles.officerItem, isCurrent && styles.officerItemActive]}
                      onPress={() => handleAssignOfficer(off)}
                      disabled={assigning}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.officerName}>👮 {off.name}</Text>
                        <Text style={styles.officerMeta}>
                          Scope: {off.scope || 'All Zones'} • {off.phone || off.email}
                        </Text>
                      </View>
                      <View style={[styles.assignPill, isCurrent && styles.assignedPill]}>
                        <Text style={styles.assignPillText}>{isCurrent ? 'Current' : 'Assign →'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  inlineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  inlineBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.15)',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  closeBtn: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  officerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.1)',
    marginBottom: 8,
  },
  officerItemActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  officerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  officerMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  assignPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignedPill: {
    backgroundColor: '#3B82F6',
  },
  assignPillText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
