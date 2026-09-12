import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import Layout from '@/components/layout/Layout';
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

  // Primeiro acesso pendente (senha provisória ou sem e-mail): nada além da
  // própria tela de primeiro acesso. Não é opcional — o backend responde 428
  // no resto do sistema; aqui só evitamos a ida e volta.
  const firstAccessPending = !!user && (!!user.mustChangePassword || !user.email);
  if (isPrivate && firstAccessPending && config.path !== '/first-access') {
    return <Navigate to="/first-access" replace />;
  }
  if (config.path === '/first-access' && user && !firstAccessPending) {
    return <Navigate to="/home" replace />;
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
      <Layout>
        <Component />
      </Layout>
    );
  }

  return <Component />;
};

export default ProtectedRoute;