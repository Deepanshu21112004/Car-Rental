import api from './api';

export const createCheckoutSession = (bookingId) =>
    api.post('/payments/create-checkout-session', {
        bookingId,
    });

export const verifyPayment = (sessionId) =>
    api.post('/payments/verify-payment', {
        sessionId,
    });

export const refundPayment = (bookingId) =>
    api.post('/payments/refund', {
        bookingId,
    });

export const getPayment = (id) => api.get(`/payments/${id}`);

export const getAdminPayments = () => api.get('/admin/payments');
