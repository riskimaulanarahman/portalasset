import axios from 'axios';

const resolveApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    const currentHost = window.location.hostname;
    const apiHost = currentHost === 'localhost' || currentHost === '::1'
        ? '127.0.0.1'
        : currentHost || '127.0.0.1';

    return `http://${apiHost}:8000/api`;
};

const api = axios.create({
    baseURL: resolveApiBaseUrl(),
    withCredentials: true,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
