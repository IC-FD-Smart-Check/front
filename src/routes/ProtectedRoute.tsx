import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import Sidebar from '@/components/layout/Sidebar';
import type { RouteConfig } from './routesConfig';

interface ProtectedRouteProps {
  config: RouteConfig;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ config }) => {
  const { isAuthenticated, user } = useAuth();
  const { component: Component, isPrivate, roles, layout, redirect } = config;

  // Se a rota é privada mas usuário não está autenticado
  if (isPrivate && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se usuário está autenticado mas tenta acessar rota pública (login)
  if (!isPrivate && isAuthenticated && config.path === '/login') {
    return <Navigate to="/home" replace />;
  }

  // Se tem roles definidas, verificar se o usuário tem permissão
  if (isPrivate && roles && user && !roles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }

  // Se tem redirect definido (como na rota '/')
  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  // Renderizar com ou sem layout
  if (layout) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-72 p-8">
          <Component />
        </main>
      </div>
    );
  }

  return <Component />;
};

export default ProtectedRoute;