import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import RegisterEmailModal from '@/components/common/RegisterEmailModal';
import Layout from '@/components/layout/Layout';
import type { RouteConfig } from './routesConfig';

interface ProtectedRouteProps {
  config: RouteConfig;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ config }) => {
  const { isAuthenticated, user } = useAuth();
  const emailPromptDismissed = useAuthStore((state) => state.emailPromptDismissed);
  const { component: Component, isPrivate, roles, layout, redirect } = config;

  // Alunos importados entram só com RA; enquanto não cadastrarem email, o aviso volta a cada acesso
  const needsEmail = isPrivate && isAuthenticated && !!user && !user.email && !emailPromptDismissed;

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
      <>
        <Layout>
          <Component />
        </Layout>
        <RegisterEmailModal isOpen={needsEmail} />
      </>
    );
  }

  return (
    <>
      <Component />
      <RegisterEmailModal isOpen={needsEmail} />
    </>
  );
};

export default ProtectedRoute;