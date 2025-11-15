import Login from '@/pages/auth/Login';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Home from '@/pages/Home';
import type { ComponentType } from 'react';

export interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  isPrivate: boolean;
  roles?: ('STUDENT' | 'ADMIN')[];
  layout?: boolean;
  redirect?: string;
}

export const routesConfig: RouteConfig[] = [
  // Rotas públicas de autenticação
  {
    path: '/login',
    component: Login,
    isPrivate: false,
    layout: false,
  },
  {
    path: '/forgot-password',
    component: ForgotPassword,
    isPrivate: false,
    layout: false,
  },

  // Rotas privadas
  {
    path: '/',
    component: Home,
    isPrivate: true,
    layout: true,
    redirect: '/home',
  },
  {
    path: '/home',
    component: Home,
    isPrivate: true,
    layout: true,
    roles: ['STUDENT', 'ADMIN'],
  },

  // Rotas que serão adicionadas futuramente
  /*
  {
    path: '/events',
    component: Events,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/checkin',
    component: CheckIn,
    isPrivate: true,
    layout: true,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    path: '/reports',
    component: Reports,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/users',
    component: Users,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  */
];