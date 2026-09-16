import { requestAPI } from './api';

export interface CreateGrievanceParams {
  title: string;
  category: string;
  priority: string;
  location: string;
  description: string;
  photoUri?: string;
  photoName?: string;
  photoType?: string;
  idempotencyKey?: string;
}

export const fetchDutyQueue = async () => {
  return await requestAPI('/api/dashboard/duty-queue', 'GET');
};

export const fetchMyGrievances = async (statusFilter?: string) => {
  let query = '/api/grievances';
  if (statusFilter && statusFilter !== 'All') {
    query += `?status=${encodeURIComponent(statusFilter)}`;
  }
  return await requestAPI(query, 'GET');
};

export const fetchGrievanceById = async (id: string) => {
  return await requestAPI(`/api/grievances/${id}`, 'GET');
};

export interface GrievancePhotoResponse {
  photoUrl: string;
  expiresIn: number;
  attachment?: {
    originalName?: string;
    mimeType?: string;
    size?: number;
    dimensions?: { width: number; height: number };
    uploadedAt?: string;
  };
}

export const fetchGrievancePhoto = async (id: string) => {
  return await requestAPI<GrievancePhotoResponse>(`/api/grievances/${id}/photo`, 'GET');
};

export const postGrievance = async (params: CreateGrievanceParams) => {
  if (params.photoUri) {
    const formData = new FormData();
    formData.append('title', params.title.trim());
    formData.append('category', params.category);
    formData.append('priority', params.priority);
    formData.append('location', params.location.trim());
    formData.append('description', params.description.trim());
    if (params.idempotencyKey) {
      formData.append('idempotencyKey', params.idempotencyKey);
    }

    const filename = params.photoName || params.photoUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    let mimeType = params.photoType || 'image/jpeg';
    if (!params.photoType) {
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }

    formData.append('photo', {
      uri: params.photoUri,
      name: filename,
      type: mimeType,
    } as any);

    return await requestAPI('/api/grievances', 'POST', formData);
  }

  // Pure JSON without undefined photo fields for grievances without attachments
  const { photoUri, photoName, photoType, ...jsonPayload } = params;
  return await requestAPI('/api/grievances', 'POST', {
    ...jsonPayload,
    title: jsonPayload.title.trim(),
    location: jsonPayload.location.trim(),
    description: jsonPayload.description.trim(),
  });
};

export const fetchTimelineUpdates = async (grievanceId: string) => {
  return await requestAPI(`/api/grievance-updates/${grievanceId}`, 'GET');
};

export const postTimelineUpdate = async (
  grievanceId: string,
  notes: string,
  type: 'Citizen Response' | 'Officer Field Note' | 'Internal Note' = 'Citizen Response'
) => {
  return await requestAPI(`/api/grievance-updates/${grievanceId}`, 'POST', {
    type,
    notes,
  });
};

export const updateGrievanceStatus = async (
  id: string,
  status: 'In Progress' | 'Resolved'
) => {
  return await requestAPI(`/api/grievances/${id}`, 'PUT', { status });
};

export const fetchOfficers = async () => {
  return await requestAPI('/api/auth/officers', 'GET');
};

export const assignGrievanceOfficer = async (id: string, assignedTo: string) => {
  return await requestAPI(`/api/grievances/${id}`, 'PUT', { assignedTo });
};
