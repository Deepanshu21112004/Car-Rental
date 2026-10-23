import api from './api';

export const createBooking = (data) => api.post('/bookings', data);

export const getMyBookings = () => api.get('/bookings/my');

export const getBooking = (id) => api.get(`/bookings/${id}`);

export const getBookingById = (id) => api.get(`/bookings/${id}`);

export const getAdminBookings = () => api.get('/admin/bookings');

export const getAdminBooking = (id) => api.get(`/admin/bookings/${id}`);

export const updateAdminBooking = (id, bookingStatus) =>
    api.put(`/admin/bookings/${id}`, {
        bookingStatus,
    });

export const cancelBooking = (id) => api.put(`/bookings/${id}/cancel`);

export const checkCarAvailability = (carId, pickupDateTime, returnDateTime) =>
    api.get('/bookings/check-availability', {
        params: {
            carId,
            pickupDateTime,
            returnDateTime,
        },
    });

export const returnBookingEarly = (id, data) => api.post(`/bookings/${id}/return-early`, data);
export const verifyDriver = (id, data) => api.put(`/admin/bookings/${id}/driver-verification`, data);
export const updateReturnInspection = (id, data) => api.put(`/admin/bookings/${id}/return-inspection`, data);

// Upcoming reserved intervals for a car, used to show unavailable time slots before booking.
export const getCarBookedSlots = (carId) => api.get(`/bookings/car/${carId}/slots`);
