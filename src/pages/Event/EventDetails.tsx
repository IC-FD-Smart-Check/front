import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, QrCode, LogIn, LogOut } from 'lucide-react';
import { eventService, subEventService } from '@/services';
import type { EventResponse, SubEventResponse } from '@/types';
import Button from '@/components/common/Button';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDayLabel = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const dayKey = (value: string) => new Date(value).toDateString();

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [subEvents, setSubEvents] = useState<SubEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [eventData, subEventsData] = await Promise.all([
          eventService.getEventById(eventId),
          subEventService.getSubEventsByEventId(eventId),
        ]);
        setEvent(eventData);
        // Ordena por horário de início para o aluno ver a programação na ordem
        setSubEvents(
          [...subEventsData].sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
        );
      } catch (err: any) {
        setError(err.response?.data?.message || 'Não foi possível carregar o evento.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B7294A]" />
        <span className="text-sm">Carregando evento...</span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 py-1">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-sm text-red-700">
          {error || 'Evento não encontrado'}
        </div>
      </div>
    );
  }

  const openMap = (latitude?: number, longitude?: number) => {
    if (latitude == null || longitude == null) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank', 'noopener');
  };

  // Programação agrupada por dia: facilita a leitura em eventos de vários dias
  const isMultiDay = subEvents.some((s) => dayKey(s.startDate) !== dayKey(subEvents[0].startDate));

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 py-1 -ml-1 px-1">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Evento */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-5 sm:mb-6">
        {event.imageBase64 && (
          <img src={event.imageBase64} alt={event.title} className="w-full h-40 sm:h-48 object-cover" />
        )}

        <div className="p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-snug">{event.title}</h1>
          {event.description && <p className="text-sm sm:text-base text-gray-600 mb-4">{event.description}</p>}

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-[#B7294A] flex-shrink-0 mt-0.5" />
              <span>
                {formatDateTime(event.startDate)} até {formatDateTime(event.endDate)}
              </span>
            </div>

            {event.latitude != null && event.longitude != null && (
              <button
                type="button"
                onClick={() => openMap(event.latitude, event.longitude)}
                className="flex items-center gap-2 text-blue-600 hover:underline py-1"
              >
                <MapPin size={16} className="flex-shrink-0" />
                <span>Ver localização no mapa</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Programação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Programação
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 align-middle">
            {subEvents.length} {subEvents.length === 1 ? 'atividade' : 'atividades'}
          </span>
        </h2>
        <Button onClick={() => navigate('/check')} className="!px-4 !py-2.5 text-sm w-full sm:w-auto">
          <span className="flex items-center justify-center gap-2">
            <QrCode size={16} /> Fazer check-in
          </span>
        </Button>
      </div>

      {subEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
          Nenhuma atividade cadastrada para este evento ainda.
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {subEvents.map((subEvent, index) => {
            const showDayHeader =
              isMultiDay && (index === 0 || dayKey(subEvent.startDate) !== dayKey(subEvents[index - 1].startDate));

            return (
              <React.Fragment key={subEvent.id}>
                {showDayHeader && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 pt-2 first:pt-0 capitalize">
                    {formatDayLabel(subEvent.startDate)}
                  </p>
                )}

                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-900 leading-snug">{subEvent.title}</h3>
                  {subEvent.description && (
                    <p className="text-sm text-gray-600 mt-1">{subEvent.description}</p>
                  )}

                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#B7294A] flex-shrink-0" />
                      <span className="tabular-nums">
                        {formatDateTime(subEvent.startDate)} — {formatTime(subEvent.endDate)}
                      </span>
                    </div>

                    {subEvent.locationDescription && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{subEvent.locationDescription}</span>
                      </div>
                    )}
                  </div>

                  {/* Janelas de check-in e checkout: horários curtos, cabem lado a lado no celular */}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-green-50 rounded-lg p-3 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-green-800 mb-1">
                        <LogIn size={14} className="flex-shrink-0" /> Check-in
                      </div>
                      <p className="text-sm text-green-900 tabular-nums">
                        {formatTime(subEvent.checkinStart)} às {formatTime(subEvent.checkinEnd)}
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800 mb-1">
                        <LogOut size={14} className="flex-shrink-0" /> Check-out
                      </div>
                      <p className="text-sm text-blue-900 tabular-nums">
                        {formatTime(subEvent.checkoutStart)} às {formatTime(subEvent.checkoutEnd)}
                      </p>
                    </div>
                  </div>

                  {subEvent.latitude != null && subEvent.longitude != null && (
                    <button
                      type="button"
                      onClick={() => openMap(subEvent.latitude, subEvent.longitude)}
                      className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-2 py-1"
                    >
                      <MapPin size={14} /> Ver no mapa
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventDetails;
