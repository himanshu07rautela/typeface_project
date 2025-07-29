import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

export const register = (data) => API.post('/users/register', data);
export const login = (data) => API.post('/users/login', data);

export default API; 