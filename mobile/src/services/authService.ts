import { requestAPI } from './api';
import { setSecureToken, setSecureUser, removeSecureToken, getSecureUser, getSecureToken } from './secureStore';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

export const loginCitizen = async (params: LoginParams) => {
  const res = await requestAPI('/api/auth/login', 'POST', params);
  if (res.data && res.data.token) {
    await setSecureToken(res.data.token);
    await setSecureUser(res.data);
  }
  return res;
};

export const registerCitizen = async (params: RegisterParams) => {
  const res = await requestAPI('/api/auth/register', 'POST', params);
  if (res.data && res.data.token) {
    await setSecureToken(res.data.token);
    await setSecureUser(res.data);
  }
  return res;
};

export const fetchCurrentProfile = async () => {
  const res = await requestAPI('/api/auth/me', 'GET');
  if (res.data && res.data._id) {
    const token = await getSecureToken();
    if (token) {
      await setSecureUser({ ...res.data, token });
    }
  }
  return res;
};

export const updateProfileInfo = async (profileData: { name?: string; phone?: string; address?: string }) => {
  const res = await requestAPI('/api/auth/profile', 'PUT', profileData);
  if (res.data && res.data._id) {
    const existing = await getSecureUser();
    if (existing) {
      await setSecureUser({ ...existing, ...res.data });
    }
  }
  return res;
};

export const logoutCitizen = async () => {
  await removeSecureToken();
};
