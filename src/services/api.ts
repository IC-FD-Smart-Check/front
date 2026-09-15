import axios from 'axios';
import { isFirstAccessPending } from '@/utils/firstAccess';

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

// O JWT viaja num cookie httpOnly emitido pelo backend, fora do alcance do
// JavaScript. Como front e API estao no mesmo dominio registravel
// (www. e api.fdsmartcheck.com.br), o withCredentials acima ja anexa o cookie
// em toda requisicao — nao existe mais token no localStorage para injetar.

/**
 * O 428 vem do servidor, mas a rota protegida decide pelo `user` guardado no
 * localStorage. Uma sessão aberta antes do deploy do primeiro acesso tem um
 * `user` sem `mustChangePassword`: a rota acha que não há pendência, volta
 * para /home, a Home chama a API, recebe 428 de novo... recarga infinita.
 *
 * Por isso, antes de redirecionar, o usuário é atualizado a partir de /me
 * (uma das poucas rotas liberadas durante a pendência). Se mesmo assim o
 * servidor e o storage discordarem, a sessão é encerrada para quebrar o ciclo.
 */
async function refreshUserThenGoToFirstAccess(): Promise<void> {
  try {
    const { data } = await api.get('/me');
    if (!isFirstAccessPending(data)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }
    localStorage.setItem('user', JSON.stringify(data));
  } catch {
    // Sem /me não dá para corrigir o storage; a tela de primeiro acesso
    // tenta de novo ao montar.
  }
  window.location.href = '/first-access';
}

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 428: sessão válida, mas o primeiro acesso ainda não foi concluído.
    // Não desloga — só leva para a tela que resolve.
    if (error.response?.status === 428 && window.location.pathname !== '/first-access') {
      return refreshUserThenGoToFirstAccess().then(() => Promise.reject(error));
    }

    // Só 401 encerra a sessão. O 403 é recusa de uma ação específica — aluno
    // não inscrito, check-in fora da rede autorizada, endpoint de admin — e
    // deslogar nesses casos jogava a pessoa para o login em vez de mostrar o
    // motivo. Quem trata o 403 é a tela que fez a chamada.
    if (error.response?.status === 401) {
      // Só redireciona se não estiver numa página pública de autenticação
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login', '/forgot-password', '/reset-password'].includes(currentPath);

      // Sem token no storage — o cookie httpOnly some via logout/expiracao.
      // Zera o 'user', que e o que decide isAuthenticated no front.
      localStorage.removeItem('user');

      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;