import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { Calendar, QrCode, Users, TrendingUp } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuthStore();

  const statsCards = [
    {
      title: 'Eventos Ativos',
      value: '12',
      icon: Calendar,
      color: '#B7294A',
    },
    {
      title: 'Check-ins Hoje',
      value: '45',
      icon: QrCode,
      color: '#4CAF50',
    },
    {
      title: 'Total de Participantes',
      value: '328',
      icon: Users,
      color: '#2196F3',
    },
    {
      title: 'Taxa de Presença',
      value: '87%',
      icon: TrendingUp,
      color: '#FF9800',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-gray-600">
            {user?.role === 'ADMIN'
              ? 'Gerencie eventos e acompanhe a presença dos estudantes'
              : 'Acompanhe seus eventos e faça check-in facilmente'}
          </p>
        </div>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                  <Icon size={24} style={{ color: stat.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Próximos Eventos</h2>
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-4">
          <Calendar size={48} className="text-primary opacity-50" />
          <p>Nenhum evento próximo no momento</p>
        </div>
      </div>
    </div>
  );
};

export default Home;