import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { postGrievance } from '../services/grievanceService';
import { updateProfileInfo } from '../services/authService';

interface SubmitGrievanceScreenProps {
  user: any;
  onNavigate: (screen: any, params?: any) => void;
}

const generateIdempotencyKey = () => {
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
};

export const SubmitGrievanceScreen: React.FC<SubmitGrievanceScreenProps> = ({ user, onNavigate }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sanitation');
  const [priority, setPriority] = useState('Medium');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  const categories = ['Sanitation', 'Water Supply', 'Roads & Traffic', 'Electricity', 'Public Safety', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  // Check for any pending image picker result on Android (recovery after activity destruction)
  useEffect(() => {
    const checkPendingResult = async () => {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending && !('code' in pending) && !pending.canceled && pending.assets && pending.assets.length > 0) {
          validateAndSetPhoto(pending.assets[0]);
        }
      } catch (err) {
        console.warn('Pending image picker result check:', err);
      }
    };
    checkPendingResult();
  }, []);

  const validateAndSetPhoto = (asset: ImagePicker.ImagePickerAsset) => {
    // Validate size: 8 MB ceiling
    if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
      Alert.alert(
        'File Too Large',
        `The selected image (${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 8 MB maximum limit. Please select a smaller photo.`
      );
      return;
    }

    // Validate format: JPEG, PNG, WebP
    const filename = asset.fileName || asset.uri.split('/').pop() || '';
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (asset.mimeType && !allowedMimes.includes(asset.mimeType.toLowerCase())) {
      Alert.alert('Invalid Format', 'Only JPEG, PNG, and WebP images are allowed as evidence attachments.');
      return;
    }
    if (ext && !allowedExts.includes(ext) && !asset.mimeType) {
      Alert.alert('Invalid Format', 'Only JPEG, PNG, and WebP images are allowed as evidence attachments.');
      return;
    }

    setSelectedPhoto(asset);
    setSubmitError(null);
  };

  const handleTakePhoto = async () => {
    if (loading) return;
    try {
      const permission = await ImagePicker.getCameraPermissionsAsync();
      let granted = permission.granted;
      if (!granted && permission.canAskAgain) {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        granted = req.granted;
      }

      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to capture on-site grievance evidence. Please enable camera access in device settings, or choose a photo from your gallery instead.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        validateAndSetPhoto(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Failed to capture photo.');
    }
  };

  const handlePickGallery = async () => {
    if (loading) return;
    try {
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = permission.granted;
      if (!granted && permission.canAskAgain) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = req.granted;
      }

      if (!granted) {
        Alert.alert(
          'Photo Library Permission Required',
          'Photo library access is required to select evidence photos. Please enable photo library access in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        validateAndSetPhoto(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Failed to open photo library.');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
  };

  const handleSubmit = async () => {
    // Double-submit protection
    if (loading) return;

    setSubmitError(null);

    if (!title.trim() || !location.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please fill in title, landmark location, and description.');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Contact Phone Required', 'Please enter your contact phone number for field officer dispatch.');
      return;
    }

    setLoading(true);
    try {
      if (!user?.phone && phone.trim()) {
        await updateProfileInfo({ phone: phone.trim() });
      }

      const res = await postGrievance({
        title: title.trim(),
        category,
        priority,
        location: location.trim(),
        description: description.trim(),
        photoUri: selectedPhoto?.uri,
        photoName: selectedPhoto?.fileName || undefined,
        photoType: selectedPhoto?.mimeType || undefined,
        idempotencyKey,
      });

      setLoading(false);

      if (res.error) {
        setSubmitError(res.error);
        Alert.alert(
          'Submission Failed',
          res.error,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleSubmit() }
          ]
        );
        return;
      }

      // Successful submission: reset state and regenerate idempotency key for next submission
      setSelectedPhoto(null);
      setIdempotencyKey(generateIdempotencyKey());
      Alert.alert('Grievance Lodged', `Your complaint #${res.data?._id?.substring(18) || ''} has been lodged successfully!`);
      onNavigate('MyGrievances');
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Failed to submit complaint to portal server.';
      setSubmitError(msg);
      Alert.alert(
        'Network Error',
        msg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSubmit() }
        ]
      );
    }
  };

  const needsProfilePhone = !user?.phone;

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
        {needsProfilePhone && (
          <View style={styles.phoneBanner}>
            <Text style={styles.phoneBannerText}>
              📌 Contact Phone Required: Please provide your contact phone number below so field officers can reach you for site inspection.
            </Text>
          </View>
        )}

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

        {/* Photographic Evidence Attachment (Optional) */}
        <View style={styles.formGroup}>
          <View style={styles.photoHeaderRow}>
            <Text style={styles.label}>Photographic Evidence (Optional)</Text>
            <Text style={styles.photoSubLabel}>JPEG, PNG, WebP • Max 8 MB</Text>
          </View>

          {!selectedPhoto ? (
            <View style={styles.photoActionRow}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handleTakePhoto}
                disabled={loading}
                accessibilityLabel="Capture photo with device camera"
              >
                <Text style={styles.photoActionBtnText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickGallery}
                disabled={loading}
                accessibilityLabel="Choose photo from photo library"
              >
                <Text style={styles.photoActionBtnText}>🖼️ Choose Gallery</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewCard}>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.previewImage}
                accessibilityLabel="Evidence preview"
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewStatus}>✓ Evidence Attached</Text>
                <Text style={styles.previewFilename} numberOfLines={1} ellipsizeMode="middle">
                  {selectedPhoto.fileName || 'evidence-photo.jpg'}
                </Text>
                <Text style={styles.previewNote}>
                  {selectedPhoto.fileSize ? `${(selectedPhoto.fileSize / (1024 * 1024)).toFixed(2)} MB • ` : ''}Secure private upload
                </Text>
                <View style={styles.previewButtonsRow}>
                  <TouchableOpacity style={styles.changePhotoBtn} onPress={handleTakePhoto} disabled={loading} accessibilityLabel="Retake photo using camera">
                    <Text style={styles.changePhotoBtnText}>📷 Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickGallery} disabled={loading} accessibilityLabel="Change photo from gallery">
                    <Text style={styles.changePhotoBtnText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto} disabled={loading} accessibilityLabel="Remove attached photo">
                    <Text style={styles.removePhotoBtnText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {submitError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {submitError}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.retryInlineBtn}>
              <Text style={styles.retryInlineBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityLabel={loading ? 'Submitting grievance' : 'Lodge official grievance'}
        >
          {loading ? (
            <View style={styles.submitBtnLoadingRow}>
              <ActivityIndicator size="small" color="#0F172A" />
              <Text style={styles.submitBtnText}> Submitting Grievance...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>📝 Lodge Official Grievance</Text>
          )}
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
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoSubLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.2)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoActionBtnText: {
    color: '#C9962C',
    fontWeight: 'bold',
    fontSize: 13,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9962C',
    padding: 10,
    gap: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  previewInfo: {
    flex: 1,
  },
  previewStatus: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  previewFilename: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  previewNote: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  previewButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  changePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(201, 150, 44, 0.15)',
  },
  changePhotoBtnText: {
    color: '#C9962C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  removePhotoBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  retryInlineBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryInlineBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
