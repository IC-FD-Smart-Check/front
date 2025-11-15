import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, QrCode, Users, LogOut, BarChart } from 'lucide-react';
import { useAuth } from '@/hooks';
import Logo from '../common/Logo';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/home', label: 'Home', icon: Home, roles: ['STUDENT', 'ADMIN'] },
    { path: '/events', label: 'Eventos', icon: Calendar, roles: ['ADMIN'] },
    { path: '/checkin', label: 'Check-in', icon: QrCode, roles: ['STUDENT', 'ADMIN'] },
    { path: '/reports', label: 'Relatórios', icon: BarChart, roles: ['ADMIN'] },
    { path: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || 'STUDENT')
  );

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col fixed h-screen left-0 top-0">
      <div className="p-6 border-b border-gray-200">
        <Logo />
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
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
  );
};

export default Sidebar;