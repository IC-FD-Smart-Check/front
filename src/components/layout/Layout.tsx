import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children?: React.ReactNode;
}

/**
 * Casca das telas autenticadas.
 * - Desktop (lg+): sidebar fixa à esquerda, conteúdo com margem de 16rem.
 * - Celular: barra superior fixa (3.5rem) com o menu; o conteúdo começa abaixo dela.
 * O padding do conteúdo mora aqui — as páginas NÃO devem adicionar padding externo.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-dvh bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 pb-safe sm:pb-8">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default Layout;
