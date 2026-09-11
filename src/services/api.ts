import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env?.VITE_API_URL as string) || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Necessário para o cookie httpOnly de identidade do aparelho, que o backend
  // emite e lê sozinho. O front e a API estão em origens diferentes
  // (www. e api.), então sem isto o navegador não anexaria o cookie.
  // O lado do servidor já permite credenciais (CorsConfig.allowCredentials).
  withCredentials: true,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Só redireciona se não estiver na página de login ou forgot-password
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/forgot-password';
      
      localStorage.removeItem('token');
      
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;