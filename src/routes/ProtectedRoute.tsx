import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import RegisterEmailModal from '@/components/common/RegisterEmailModal';
import Sidebar from '@/components/layout/Sidebar';
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
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        {/* ml-64 abre espaço para a sidebar fixa; min-w-0 evita que tabelas largas estourem a largura */}
        <main className="flex-1 min-w-0 p-8 pt-16 lg:pt-8 lg:ml-64">
          <Component />
        </main>
        <RegisterEmailModal isOpen={needsEmail} />
      </div>
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