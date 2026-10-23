import api from './api';

const getApiOrigin = () => {
    const base = api.defaults.baseURL || '';
    return base.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

export const getCars = (params = {}) => api.get('/cars', { params });

export const getCar = (id) => api.get(`/cars/${id}`);

export const getCarById = getCar;

export const createCar = (data) => api.post('/cars', data);

export const updateCar = (id, data) => api.put(`/cars/${id}`, data);

export const deleteCar = (id) => api.delete(`/cars/${id}`);

export const getCarImage = (imagePath) => {
    if (!imagePath) return '/car-placeholder.svg';

    if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:')) {
        return imagePath;
    }

    const normalizedPath = String(imagePath).replace(/^\/+/, '');

    if (normalizedPath.startsWith('uploads/')) {
        return `${getApiOrigin()}/${normalizedPath}`;
    }

    return imagePath;
};

export const getFavorites = () => api.get('/favorites');

export const toggleFavorite = (carId) => api.post('/favorites', { carId });

export const removeFavorite = (carId) => api.delete(`/favorites/${carId}`);
