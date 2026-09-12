import { requestAPI } from './api';

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  scope?: string;
  phone?: string;
}

export interface AuditLogItem {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    role: string;
  };
  action: string;
  details: string;
  createdAt: string;
}

export const fetchStaffUsers = async () => {
  return await requestAPI<StaffUser[]>('/api/auth/staff', 'GET');
};

export const fetchAuditLogs = async () => {
  return await requestAPI<AuditLogItem[]>('/api/audit', 'GET');
};

export const fetchDashboardStats = async () => {
  return await requestAPI('/api/dashboard/stats', 'GET');
};

