// frontend/src/services/api.ts
import axios from 'axios';
import { getSession } from './firebase';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 120000,
});

// Attach Firebase UID + email to every request for user isolation
api.interceptors.request.use((config) => {
  const session = getSession();
  if (session) {
    config.headers['X-User-Email'] = session.email || '';
    config.headers['X-User-ID']    = session.uid   || '';
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export const uploadDocument = (
  file: File,
  documentType: string,
  onProgress?: (pct: number) => void,
) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('document_type', documentType);
  return api.post('/api/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const getDocuments        = (params?: any)  => api.get('/api/documents', { params });
export const getDocument         = (id: string)    => api.get(`/api/documents/${id}`);
export const getExtraction       = (id: string)    => api.get(`/api/extractions/${id}`);
export const getReviewQueue      = ()              => api.get('/api/review/queue');
export const approveDocument     = (id: string)    => api.post(`/api/review/${id}/approve`);
export const submitCorrection    = (id: string, data: any) => api.post(`/api/review/${id}/correct`, data);
export const getAuditLogs        = (docId?: string)=> api.get('/api/audit', { params: docId ? { document_id: docId } : {} });
export const getStats            = ()              => api.get('/api/stats');
export const getProcessingStatus = (id: string)    => api.get(`/api/documents/${id}/status`);
export const deleteDocument      = (id: string)    => api.delete(`/api/documents/${id}`);

export default api;