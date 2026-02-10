import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Calendar, QrCode, Users, TrendingUp, Clock, MapPin } from 'lucide-react';
import { eventService } from '@/services';
import { EventResponse } from '@/types';

const Home: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [upcomingEvents, setUpcomingEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const events = await eventService.getUpcoming();
        setUpcomingEvents(events);
      } catch (error) {
        console.error("Erro ao carregar próximos eventos", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statsCards = [
    { title: 'Eventos Ativos', value: '12', icon: Calendar, color: '#B7294A' },
    { title: 'Check-ins Hoje', value: '45', icon: QrCode, color: '#4CAF50' },
    { title: 'Total de Participantes', value: '328', icon: Users, color: '#2196F3' },
    { title: 'Taxa de Presença', value: '87%', icon: TrendingUp, color: '#FF9800' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Próximos Eventos</h2>
          {user?.role === 'ADMIN' && (
             <button onClick={() => navigate('/events')} className="text-sm text-[#B7294A] hover:underline">Ver todos</button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B7294A]"></div>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-4">
            <Calendar size={48} className="text-gray-300" />
            <p>Nenhum evento próximo agendado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <div 
                key={event.id} 
                className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white group"
                onClick={() => navigate(user?.role === 'ADMIN' ? `/events/${event.id}/subevents` : `/checkin`)} // Redireciona dependendo da role
              >
                <div className="h-32 bg-gray-100 relative overflow-hidden">
                  {event.imageBase64 ? (
                    <img 
                      src={event.imageBase64} 
                      alt={event.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                      <Calendar size={32} className="opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-gray-800 shadow-sm">
                    {new Date(event.startDate).getDate()} {new Date(event.startDate).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-1" title={event.title}>
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#B7294A]" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    
                    {event.latitude && (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500" />
                        <span className="truncate">Ver localização</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;