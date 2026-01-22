import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, QrCode, Users, LogOut, BarChart, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks';
import Logo from '../common/Logo';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const menuItems = [
    { path: '/home', label: 'Home', icon: Home, roles: ['STUDENT', 'ADMIN'] },
    { path: '/events', label: 'Eventos', icon: Calendar, roles: ['ADMIN'] },
    { path: '/check', label: 'Check', icon: QrCode, roles: ['STUDENT', 'ADMIN'] },
    { path: '/reports', label: 'Relatórios', icon: BarChart, roles: ['ADMIN'] },
    { path: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || 'STUDENT')
  );

  return (
    <>
      {/* Botão Menu Mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-72 bg-white border-r border-gray-200 flex flex-col fixed h-screen left-0 top-0 z-40
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-y-auto overflow-x-hidden
      `}>
        <div className="flex justify-center items-center border-b border-gray-200">
      <div className="p-4 w-40 flex justify-center items-center">
        <Logo />
      </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all mb-1 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="p-3 mb-2">
          <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
          <p className="text-xs text-gray-600 mt-0.5">{user?.role === 'ADMIN' ? 'Administrador' : 'Estudante'}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 bg-transparent border border-gray-300 rounded-lg text-gray-700 font-medium cursor-pointer transition-all hover:bg-gray-100 hover:border-primary hover:text-primary">
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;