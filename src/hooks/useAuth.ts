import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services';
import type { LoginRequest, ForgotPasswordRequest, User } from '@/types';

interface UseAuthReturn {
  // Estados
  loading: boolean;
  error: string | null;
  
  // Ações
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<boolean>;
  clearError: () => void;
  
  // Informações
  isAuthenticated: boolean;
  user: User | null;
}

/**
 * Hook personalizado para gerenciar autenticação
 */
export const useAuth = (): UseAuthReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore();

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(credentials);
      setAuth(response.user, response.token);
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (err: any) {
      console.warn('Erro no logout:', err.message);
    } finally {
      clearAuth();
      setLoading(false);
    }
  };

  const forgotPassword = async (data: ForgotPasswordRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.forgotPassword(data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    login,
    logout,
    forgotPassword,
    clearError,
    isAuthenticated,
    user,
  };
};

export default useAuth;