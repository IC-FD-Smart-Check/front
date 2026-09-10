import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Calendar, QrCode, Users, TrendingUp, Clock, MapPin, ChevronRight } from 'lucide-react';
import { dashboardService, eventService } from '@/services';
import PageLoader from '@/components/common/PageLoader';
import type { DashboardStatsResponse, EventResponse } from '@/types';

const Home: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [upcomingEvents, setUpcomingEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN';
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(isAdmin);

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

  // Métricas dos cards — só o admin tem acesso ao endpoint
  useEffect(() => {
    if (!isAdmin) return;

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error("Erro ao carregar métricas do dashboard", error);
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, [isAdmin]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statsCards = [
    {
      title: 'Eventos Ativos',
      value: stats ? String(stats.activeEvents) : '—',
      icon: Calendar,
      color: '#B7294A',
    },
    {
      title: 'Check-ins Hoje',
      value: stats ? String(stats.checkinsToday) : '—',
      icon: QrCode,
      color: '#4CAF50',
    },
    {
      title: 'Total de Participantes',
      value: stats ? String(stats.totalParticipants) : '—',
      icon: Users,
      color: '#2196F3',
    },
    {
      title: 'Taxa de Presença',
      value: stats ? `${Math.round(stats.attendanceRate)}%` : '—',
      icon: TrendingUp,
      color: '#FF9800',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
          Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {isAdmin
            ? 'Gerencie eventos e acompanhe a presença dos estudantes'
            : 'Acompanhe seus eventos e faça check-in facilmente'}
        </p>
      </div>

      {/* Atalho principal do aluno: check-in pela câmera */}
      {!isAdmin && (
        <button
          type="button"
          onClick={() => navigate('/check')}
          className="w-full mb-5 sm:mb-8 bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] text-white rounded-2xl shadow-md p-4 sm:p-5 flex items-center gap-4 text-left hover:shadow-lg active:scale-[0.99] transition-all"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <QrCode size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base sm:text-lg leading-tight">Fazer check-in</p>
            <p className="text-sm text-white/85 mt-0.5">Escaneie o QR code do evento</p>
          </div>
          <ChevronRight size={22} className="flex-shrink-0 text-white/80" />
        </button>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-5 sm:mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm flex items-center gap-3 sm:gap-4 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}20` }}>
                  <Icon size={22} style={{ color: stat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 leading-tight">{stat.title}</p>
                  {loadingStats ? (
                    <div className="h-7 sm:h-8 flex items-center">
                      <div className="h-5 sm:h-6 w-10 sm:w-12 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ) : (
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</h3>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {isAdmin ? 'Próximos Eventos' : 'Meus Próximos Eventos'}
          </h2>
          {isAdmin && (
             <button onClick={() => navigate('/events')} className="text-sm text-[#B7294A] hover:underline whitespace-nowrap">Ver todos</button>
          )}
        </div>

        {loading ? (
          <PageLoader compact message="Carregando eventos..." />
        ) : upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-gray-600 gap-3 text-center px-2 sm:px-4">
            <Calendar size={48} className="text-gray-300" />
            {isAdmin ? (
              <p>Nenhum evento próximo agendado</p>
            ) : (
              <>
                <p className="font-medium text-gray-700">
                  Você ainda não está inscrito em nenhum evento
                </p>
                <p className="text-sm text-gray-500 max-w-sm">
                  Assim que a coordenação inscrever você em uma atividade, ela aparece aqui.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {upcomingEvents.map((event) => (
              <button
                type="button"
                key={event.id}
                className="text-left border border-gray-100 rounded-xl overflow-hidden hover:shadow-md active:bg-gray-50 transition-shadow bg-white group"
                onClick={() =>
                  navigate(isAdmin ? `/events/${event.id}/subevents` : `/events/${event.id}`)
                }
              >
                <div className="h-32 sm:h-36 bg-gray-100 relative overflow-hidden">
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
                    {new Date(event.startDate).getDate()} {new Date(event.startDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 leading-snug" title={event.title}>
                    {event.title}
                  </h3>

                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#B7294A] flex-shrink-0" />
                      <span className="capitalize">{formatDate(event.startDate)}</span>
                    </div>

                    {event.latitude && (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate">Ver localização</span>
                      </div>
                    )}
                  </div>

                  {!isAdmin && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm font-medium text-[#B7294A]">
                      <span>Ver programação</span>
                      <ChevronRight size={16} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
