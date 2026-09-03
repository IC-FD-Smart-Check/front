import Login from '@/pages/auth/Login';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Home from '@/pages/Home';
import UsersList from '@/pages/UsersList';
import type { ComponentType } from 'react';
import Check from '@/pages/check/check';
import Event from '@/pages/Event/Event.tsx';
import EventDetails from '@/pages/Event/EventDetails';
import SubEventList from '@/pages/SubEvent/SubEventList';
import Reports from '@/components/check/admin/Reports';
import Academic from '@/pages/Academic/Academic';
import StudentImport from '@/pages/Import/StudentImport';
import Profile from '@/pages/Profile/Profile';

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
  {
    path: '/users',
    component: UsersList,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/check',
    component: Check,
    isPrivate: true,
    layout: true,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    path: '/events',
    component: Event,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/events/:eventId',
    component: EventDetails,
    isPrivate: true,
    layout: true,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    path: '/events/:eventId/subevents',
    component: SubEventList,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/reports',
    component: Reports,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/academic',
    component: Academic,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
  },
  {
    path: '/perfil',
    component: Profile,
    isPrivate: true,
    layout: true,
    roles: ['STUDENT', 'ADMIN'],
  },
  {
    path: '/import',
    component: StudentImport,
    isPrivate: true,
    layout: true,
    roles: ['ADMIN'],
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