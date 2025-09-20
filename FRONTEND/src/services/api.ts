import axios from 'axios';
import type { 
  Model, 
  Content, 
  Report, 
  FilterOptions, 
  LoginCredentials, 
  RegisterCredentials,
  ApiResponse 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add age confirmation header
  const ageConfirmed = sessionStorage.getItem('ageConfirmed');
  if (ageConfirmed === 'true') {
    config.headers['x-age-confirmed'] = 'true';
  }
  
  return config;
});

// Models API
export const modelsApi = {
  getAll: async (params?: FilterOptions & { page?: number; limit?: number; sortBy?: string }) => {
    const response = await api.get<ApiResponse<Model[]>>('/models', { params });
    return response.data;
  },
  
  getBySlug: async (slug: string) => {
    const response = await api.get<Model>(`/models/${slug}`);
    return response.data;
  },
  
  create: async (data: Partial<Model>) => {
    const response = await api.post<Model>('/models', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<Model>) => {
    const response = await api.put<Model>(`/models/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    await api.delete(`/models/${id}`);
  },
  
  getUserHistory: async (params?: { page?: number; limit?: number; action?: string }) => {
    const response = await api.get('/models/user/history', { params });
    return response.data;
  }
};

// Content API
export const contentApi = {
  getAll: async (params?: { page?: number; limit?: number; sortBy?: string; search?: string }) => {
    const response = await api.get<ApiResponse<Content[]>>('/content', { params });
    return response.data;
  },
  
  getByModel: async (modelId: number, params?: { page?: number; limit?: number; type?: string; sortBy?: string }) => {
    const response = await api.get<ApiResponse<Content[]>>(`/content/model/${modelId}`, { params });
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get<Content>(`/content/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Content>) => {
    const response = await api.post<Content>('/content', data);
    return response.data;
  },

    update: async (id: number, data: Partial<Content>) => {
    const response = await api.put<Content>(`/content/${id}`, data);
    return response.data;
  },

  // ADICIONAR:
  delete: async (id: number) => {
    await api.delete(`/content/${id}`);
  },
  
  recordView: async (id: number) => {
    const response = await api.post(`/content/${id}/view`);
    return response.data;
  },
  
  share: async (id: number, platform: string) => {
    const response = await api.post(`/content/${id}/share`, { platform });
    return response.data;
  }
};

// Reports API
export const reportsApi = {
  create: async (data: Partial<Report>) => {
    const response = await api.post<{ message: string; reportId: number }>('/reports', data);
    return response.data;
  },
  
  getAll: async (params?: { page?: number; limit?: number; status?: string; reason?: string }) => {
    const response = await api.get<ApiResponse<Report[]>>('/reports', { params });
    return response.data;
  },
  
  updateStatus: async (id: number, status: string, adminNotes?: string) => {
    const response = await api.put(`/reports/${id}`, { status, adminNotes });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/reports/stats');
    return response.data;
  }
};

// Auth API
export const authApi = {
  register: async (credentials: RegisterCredentials) => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },
  
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },
  
  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },
  
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
  
  getDashboard: async () => {
    const response = await api.get('/auth/dashboard');
    return response.data;
  },
  
  updateProfile: async (data: { name?: string; language?: string; country?: string }) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
  
  deleteAccount: async (password: string) => {
    const response = await api.delete('/auth/account', { data: { password } });
    return response.data;
  },
  
  uploadProfilePhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/auth/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Billing API
export const billingApi = {
  createPortalSession: async (email: string) => {
    const response = await api.post('/billing/portal', { email });
    return response.data;
  }
};
// Age Verification API
export const ageVerificationApi = {
  confirm: async (confirmed: boolean) => {
    const response = await api.post('/age-verification/confirm', { confirmed });
    return response.data;
  },
  
  getStatus: async () => {
    const response = await api.get('/age-verification/status');
    return response.data;
  },
  
  revoke: async () => {
    const response = await api.post('/age-verification/revoke');
    return response.data;
  }
};

// Internationalization API
export const i18nApi = {
  getLanguages: async () => {
    const response = await api.get('/i18n/languages');
    return response.data;
  },
  
  getTranslations: async (lang: string) => {
    const response = await api.get(`/i18n/translations/${lang}`);
    return response.data;
  },
  
  detectLanguage: async () => {
    const response = await api.get('/i18n/detect');
    return response.data;
  }
};

// Comments API
export const commentsApi = {
  getAll: async (params?: { contentId?: number; modelId?: number; page?: number; limit?: number }) => {
    const response = await api.get('/comments', { params });
    return response.data;
  },
  
  create: async (data: { contentId?: number; modelId?: number; text: string }) => {
    const response = await api.post('/comments', data);
    return response.data;
  },
  
  update: async (id: number, data: { text: string }) => {
    const response = await api.put(`/comments/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    await api.delete(`/comments/${id}`);
  },
  
  toggleLike: async (id: number) => {
    const response = await api.post(`/comments/${id}/like`);
    return response.data;
  }
};

// Notifications API
export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  
  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
  
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  }
};

// Likes API
export const likesApi = {
  toggle: async (data: { contentId?: number; modelId?: number; type: 'content' | 'model' }) => {
    const response = await api.post('/likes/toggle', data);
    return response.data;
  },
  
  getStats: async (params: { contentId?: number; modelId?: number }) => {
    const response = await api.get('/likes/stats', { params });
    return response.data;
  }
};

// Admin API
export const adminApi = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  
  getActiveUsers: async () => {
    const response = await api.get('/admin/active-users');
    return response.data;
  },
  
  getContentCharts: async () => {
    const response = await api.get('/admin/content/charts');
    return response.data;
  },
  
  getUserAnalytics: async (period = '30') => {
    const response = await api.get('/admin/users/analytics', { params: { period } });
    return response.data;
  },
  
  getContentAnalytics: async () => {
    const response = await api.get('/admin/content/analytics');
    return response.data;
  }
};

// Recommendations API
export const recommendationsApi = {
  create: async (data: { modelId: number; description: string }) => {
    const response = await api.post('/recommendations', data);
    return response.data;
  },
  
  getRemainingCount: async () => {
    const response = await api.get('/recommendations/remaining');
    return response.data;
  }
};

export default api;