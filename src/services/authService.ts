import api from './api';
import type {
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  User,
} from '../types';

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
        error.response?.data?.message || 'Erro ao fazer login. Verifique seu email/RA e senha.'
      );
    }
  }

  /**
   * Solicita recuperação de senha por e-mail ou RA.
   * A resposta diz o que aconteceu, para a tela orientar o aluno.
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    try {
      const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Erro ao enviar solicitação. Tente novamente.'
      );
    }
  }

  /** Confere o token do link antes de mostrar o formulário. */
  async validateResetToken(token: string): Promise<boolean> {
    try {
      const response = await api.get<{ valid: boolean }>('/auth/reset-password/validate', {
        params: { token },
      });
      return !!response.data?.valid;
    } catch {
      return false;
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      await api.post('/auth/reset-password', data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Não foi possível redefinir a senha. Peça um novo link.'
      );
    }
  }

  /**
   * Realiza logout do usuário (notifica o backend; erros são silenciados)
   */
  logout(): Promise<void> {
    return api.post('/auth/logout').then(() => {}).catch(() => {});
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

}

// Exporta uma instância singleton
export const authService = new AuthService();
export default authService;