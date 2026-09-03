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

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
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

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#B7294A] text-white rounded-lg shadow-lg"
        >
          <Menu size={20} />
        </button>
      )}

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        w-64 bg-white  flex flex-col
        fixed h-screen left-0 top-0 z-40
        transition-transform duration-300
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-xl lg:shadow-none
      `}>
        <div className="flex items-center justify-between p-4 border-b bg-[#B7294A] lg:bg-white">
          <div className="lg:w-full lg:flex lg:justify-center">
            <div className="w-32 lg:block hidden">
              <Logo />
            </div>
            <h2 className="text-lg font-bold text-white lg:hidden">Menu</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden p-1.5 hover:bg-white/20 rounded"
          >
            <X size={18} className="text-white" />
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
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#B7294A]/10 text-[#B7294A]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t bg-gray-50">
          <Link
            to="/perfil"
            className="flex items-center gap-2 p-2.5 mb-2 bg-white rounded-lg border hover:border-[#B7294A] hover:bg-[#B7294A]/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#B7294A]/10 flex items-center justify-center">
              <span className="text-[#B7294A] font-bold text-xs">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-xs truncate">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.role === 'ADMIN' ? 'Admin' : 'Estudante'}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-white border rounded-lg text-gray-700 text-xs font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600"
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