import { requestAPI } from './api';

export interface CreateGrievanceParams {
  title: string;
  category: string;
  priority: string;
  location: string;
  description: string;
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

export const postGrievance = async (params: CreateGrievanceParams) => {
  return await requestAPI('/api/grievances', 'POST', params);
};

export const fetchTimelineUpdates = async (grievanceId: string) => {
  return await requestAPI(`/api/grievance-updates/${grievanceId}`, 'GET');
};

export const postTimelineUpdate = async (grievanceId: string, notes: string) => {
  return await requestAPI(`/api/grievance-updates/${grievanceId}`, 'POST', {
    type: 'Citizen Response',
    notes,
  });
};
