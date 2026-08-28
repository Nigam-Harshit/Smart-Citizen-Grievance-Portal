import { getSecureToken } from './secureStore';

export const API_BASE_URL = 'https://smart-citizen-grievance-portal.onrender.com';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  error?: string;
}

export const requestAPI = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body: any = null
): Promise<ApiResponse<T>> => {
  const token = await getSecureToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const config: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: response.status,
        data,
        error: data.message || `Request failed with status ${response.status}`,
      };
    }

    return {
      status: response.status,
      data,
    };
  } catch (error: any) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    return {
      status: 500,
      data: null as any,
      error: error.message || 'Network error, please check connection',
    };
  }
};
