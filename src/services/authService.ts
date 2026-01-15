import api from './api';
import type { LoginRequest, LoginResponse, ForgotPasswordRequest, User } from '../types';

class AuthService {
  private readonly STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
  };

  /**
   * Realiza o login do usuário
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      
      if (response.data) {
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
   * Solicita recuperação de senha
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    try {
      await api.post('/auth/forgot-password', data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao enviar solicitação. Tente novamente.'
      );
    }
  }

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<void> {
    try {
      // Chama endpoint de logout no backend (opcional)
      await api.post('/auth/logout');
    } catch (error) {
      // Continua com logout local mesmo se o backend falhar
      console.warn('Erro no logout do backend:', error);
    } finally {
      this.clearAuthData();
    }
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