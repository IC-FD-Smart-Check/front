import api from './api';
import type { LoginRequest, LoginResponse, ForgotPasswordRequest, User } from '../types';

/**
 * 🚧 MODO DESENVOLVIMENTO - LOGIN MOCKADO 🚧
 * 
 * Este serviço está configurado para funcionar SEM backend.
 * 
 * Para testar:
 * - Email: qualquer email válido (ex: user@test.com)
 * - Email Admin: admin@instituicao.edu.br ou qualquer email com 'admin'
 * - Senha: qualquer texto com 6+ caracteres
 * 
 * Quando tiver o backend, descomente o código real nos métodos.
 */

class AuthService {
  private readonly STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
  };

  /**
   * Realiza o login do usuário (MOCKADO PARA DESENVOLVIMENTO)
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Simula delay da API
    // await new Promise(resolve => setTimeout(resolve, 1000));

    // // Login mockado - aceita email válido e senha com 6+ caracteres
    // if (!/\S+@\S+\.\S+/.test(credentials.email)) {
    //   throw new Error('Email inválido');
    // }

    // if (credentials.password.length < 6) {
    //   throw new Error('Senha deve ter no mínimo 6 caracteres');
    // }

    // // Simula diferentes tipos de usuários baseado no email
    // const isAdmin = credentials.email.includes('admin') || credentials.email === 'admin@instituicao.edu.br';
    
    // const mockUser: User = {
    //   id: `user_${credentials.email.split('@')[0]}`,
    //   email: credentials.email,
    //   name: isAdmin ? 'Administrador Sistema' : `Usuário ${credentials.email.split('@')[0]}`,
    //   role: isAdmin ? 'ADMIN' : 'STUDENT'
    // };

    // const mockToken = `mock_token_${credentials.email.split('@')[0]}_${Date.now()}`;

    // const response: LoginResponse = {
    //   token: mockToken,
    //   user: mockUser
    // };

    // // Salvar no localStorage
    // this.setTokens(response.token);
    // this.setUser(response.user);

    // return response;

    // CÓDIGO REAL COMENTADO PARA QUANDO TIVER BACKEND:
    
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      
      if (response.data) {
        // Salvar no localStorage
        this.setTokens(response.data.token);
        this.setUser(response.data.user);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao fazer login. Verifique seu email e senha.'
      );
    }

    
  }

  /**
   * Solicita recuperação de senha (MOCKADO PARA DESENVOLVIMENTO)
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    // Simula delay da API
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validação mockada
    if (!/\S+@\S+\.\S+/.test(data.email)) {
      throw new Error('Email inválido');
    }

    // Simula sucesso sempre
    console.log(`[MOCK] Solicitação de recuperação enviada para email: ${data.email}`);

    // CÓDIGO REAL COMENTADO PARA QUANDO TIVER BACKEND:
    /*
    try {
      await api.post('/auth/forgot-password', data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao enviar solicitação. Tente novamente.'
      );
    }
    */
  }

  /**
   * Realiza logout do usuário (MOCKADO PARA DESENVOLVIMENTO)
   */
  async logout(): Promise<void> {
    // Simula delay da API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[MOCK] Logout realizado');
    this.clearAuthData();

    // CÓDIGO REAL COMENTADO PARA QUANDO TIVER BACKEND:
    /*
    try {
      // Chama endpoint de logout no backend (opcional)
      await api.post('/auth/logout');
    } catch (error) {
      // Continua com logout local mesmo se o backend falhar
      console.warn('Erro no logout do backend:', error);
    } finally {
      this.clearAuthData();
    }
    */
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  /**
   * Obtém o token atual
   */
  getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
  }

  /**
   * Obtém o usuário atual
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Atualiza o perfil do usuário
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await api.put<User>('/auth/profile', data);
      
      if (response.data) {
        this.setUser(response.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao atualizar perfil.'
      );
    }
  }

  /**
   * Altera a senha do usuário
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao alterar senha.'
      );
    }
  }

  /**
   * Verifica se o token é válido
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await api.get('/auth/validate');
      return response.data?.valid || false;
    } catch {
      return false;
    }
  }

  /**
   * Obtém o perfil completo do usuário
   */
  async getProfile(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/profile');
      
      if (response.data) {
        this.setUser(response.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao buscar perfil.'
      );
    }
  }

  // Métodos privados para gerenciar localStorage
  private setTokens(token: string): void {
    localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.USER);
  }
}

// Exporta uma instância singleton
export const authService = new AuthService();
export default authService;