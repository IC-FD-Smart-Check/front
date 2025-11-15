export interface User {
  id: string;
  ra: string;
  email?: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface LoginRequest {
  ra: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordRequest {
  ra: string;
}