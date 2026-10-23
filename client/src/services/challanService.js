import api from './api';

export const getMyChallans = () => api.get('/challans/my');
export const getAdminChallans = () => api.get('/challans');
export const createChallan = (data) => api.post('/challans', data);
export const updateChallan = (id, data) => api.put(`/challans/${id}`, data);

export const disputeChallan = (id, reason) => api.post(`/challans/${id}/dispute`, { reason });

export const createChallanPayment = (id) => api.post(`/challans/${id}/pay`);
export const verifyChallanPayment = (sessionId) => api.post('/challans/verify-payment', { sessionId });
