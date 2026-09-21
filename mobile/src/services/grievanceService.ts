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

    // Convert local photo URI into a Blob/File compatible with Expo/RN WinterCG FormData
    let filePart: any;
    try {
      const response = await fetch(params.photoUri);
      const blob = await response.blob();
      if (typeof File !== 'undefined') {
        filePart = new File([blob], filename, { type: mimeType });
      } else {
        filePart = blob;
      }
    } catch {
      filePart = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          const blob = xhr.response as Blob;
          if (typeof File !== 'undefined') {
            resolve(new File([blob], filename, { type: mimeType }));
          } else {
            resolve(blob);
          }
        };
        xhr.onerror = () => reject(new Error('Failed to load image file into memory'));
        xhr.responseType = 'blob';
        xhr.open('GET', params.photoUri!, true);
        xhr.send(null);
      });
    }

    if (filePart && typeof filePart === 'object') {
      filePart.name = filename;
      filePart.type = mimeType;
      Object.assign(filePart, { uri: params.photoUri });
      if (!('bytes' in filePart)) {
        filePart.bytes = async () => {
          if (typeof filePart.arrayBuffer === 'function') {
            return new Uint8Array(await filePart.arrayBuffer());
          }
          return new Uint8Array();
        };
      }
    }

    formData.append('photo', filePart as any, filename);

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
  message: string,
  authorRole?: string,
  type?: string
) => {
  return await requestAPI(`/api/grievance-updates/${grievanceId}`, 'POST', {
    message,
    notes: message,
    authorRole,
    type: type || 'Citizen Response',
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
