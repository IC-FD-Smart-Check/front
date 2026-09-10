import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, QrCode, Users, LogOut, BarChart, Menu, X, GraduationCap, Upload } from 'lucide-react';
import { useAuth } from '@/hooks';
import Logo from '../common/Logo';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Fecha o menu ao trocar de rota
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Trava a rolagem da página enquanto o menu está aberto e fecha com Esc
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/home', label: 'Home', icon: Home, roles: ['STUDENT', 'ADMIN'] },
    { path: '/events', label: 'Eventos', icon: Calendar, roles: ['ADMIN'] },
    { path: '/check', label: 'Check-in', icon: QrCode, roles: ['STUDENT', 'ADMIN'] },
    { path: '/reports', label: 'Relatórios', icon: BarChart, roles: ['ADMIN'] },
    { path: '/academic', label: 'Cursos e Turmas', icon: GraduationCap, roles: ['ADMIN'] },
    { path: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
    { path: '/import', label: 'Importar Alunos', icon: Upload, roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || 'STUDENT')
  );

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : 'Estudante';

  return (
    <>
      {/* Barra superior — só no celular/tablet */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 bg-white border-b border-gray-200 shadow-sm flex items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isOpen}
          className="p-2.5 -ml-1 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Menu size={22} />
        </button>

        {/* No celular a logo completa fica alta demais; usa só o nome em texto */}
        <Link
          to="/home"
          aria-label="Ir para a Home"
          className="text-[#B7294A] font-extrabold text-lg leading-none tracking-tight select-none"
          style={{ fontFamily: "'Nunito', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
        >
          FD SmartCheck
        </Link>

        <Link
          to="/perfil"
          aria-label="Meu perfil"
          className="ml-auto w-9 h-9 rounded-full bg-[#B7294A]/10 flex items-center justify-center hover:bg-[#B7294A]/20 transition-colors"
        >
          <span className="text-[#B7294A] font-bold text-sm">{initial}</span>
        </Link>
      </header>

      {/* Fundo escurecido atrás do menu aberto */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menu principal"
        className={`
          w-72 max-w-[85vw] lg:w-64 bg-white flex flex-col
          fixed h-dvh left-0 top-0 z-40
          transition-transform duration-300
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          shadow-xl lg:shadow-none lg:border-r lg:border-gray-200
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#B7294A] lg:bg-white">
          <div className="lg:w-full lg:flex lg:justify-center">
            <div className="w-32 lg:block hidden">
              <Logo />
            </div>
            <h2 className="text-lg font-bold text-white lg:hidden">Menu</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar menu"
            className="lg:hidden p-2 hover:bg-white/20 rounded-lg"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-3 lg:py-2.5 mb-1 rounded-lg text-[15px] lg:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#B7294A]/10 text-[#B7294A]'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <Icon size={20} className="lg:w-[18px] lg:h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 bg-gray-50 pb-safe">
          <Link
            to="/perfil"
            className="flex items-center gap-3 p-3 lg:p-2.5 mb-2 bg-white rounded-lg border border-gray-200 hover:border-[#B7294A] hover:bg-[#B7294A]/5 transition-colors"
          >
            <div className="w-9 h-9 lg:w-8 lg:h-8 rounded-full bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#B7294A] font-bold text-sm lg:text-xs">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm lg:text-xs truncate">{user?.name}</p>
              <p className="text-xs text-gray-600">{roleLabel}</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-3 lg:py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm lg:text-xs font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
