import api from './api';

export const getCarReviews = (carId) => api.get(`/reviews/car/${carId}`);

export const getMyReviews = () => api.get('/reviews/my');

export const createReview = (data) => api.post('/reviews', data);

export const updateReview = (id, data) => api.put(`/reviews/${id}`, data);

export const deleteReview = (id) => api.delete(`/reviews/${id}`);

export const getAdminReviews = () => api.get('/admin/reviews');
