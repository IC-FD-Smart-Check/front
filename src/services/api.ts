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
    // 428: sessão válida, mas o primeiro acesso ainda não foi concluído.
    // Não desloga — só leva para a tela que resolve.
    if (error.response?.status === 428 && window.location.pathname !== '/first-access') {
      window.location.href = '/first-access';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Só redireciona se não estiver numa página pública de autenticação
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login', '/forgot-password', '/reset-password'].includes(currentPath);
      
      localStorage.removeItem('token');
      
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;