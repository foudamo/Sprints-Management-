const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = isDev ? 'http://localhost:3001' : '';

export const API_BASE_URL = apiUrl;
export const SOCKET_URL = apiUrl;
