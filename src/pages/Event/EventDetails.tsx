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

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando evento...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
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

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Evento */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        {event.imageBase64 && (
          <img src={event.imageBase64} alt={event.title} className="w-full h-48 object-cover" />
        )}

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
          {event.description && <p className="text-gray-600 mb-4">{event.description}</p>}

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#B7294A] flex-shrink-0" />
              <span>
                {formatDateTime(event.startDate)} até {formatDateTime(event.endDate)}
              </span>
            </div>

            {event.latitude != null && event.longitude != null && (
              <button
                type="button"
                onClick={() => openMap(event.latitude, event.longitude)}
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <MapPin size={16} className="flex-shrink-0" />
                <span>Ver localização no mapa</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Programação */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Programação ({subEvents.length})
        </h2>
        <Button onClick={() => navigate('/check')} className="!px-4 !py-2 text-sm">
          <span className="flex items-center gap-2">
            <QrCode size={16} /> Fazer check-in
          </span>
        </Button>
      </div>

      {subEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Nenhuma atividade cadastrada para este evento ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {subEvents.map((subEvent) => (
            <div key={subEvent.id} className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900">{subEvent.title}</h3>
              {subEvent.description && (
                <p className="text-sm text-gray-600 mt-1">{subEvent.description}</p>
              )}

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#B7294A] flex-shrink-0" />
                  <span>
                    {formatDateTime(subEvent.startDate)} — {formatTime(subEvent.endDate)}
                  </span>
                </div>

                {subEvent.locationDescription && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{subEvent.locationDescription}</span>
                  </div>
                )}
              </div>

              {/* Janelas de check-in e checkout */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-green-800 mb-1">
                    <LogIn size={14} /> Check-in
                  </div>
                  <p className="text-sm text-green-900">
                    {formatTime(subEvent.checkinStart)} às {formatTime(subEvent.checkinEnd)}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-800 mb-1">
                    <LogOut size={14} /> Check-out
                  </div>
                  <p className="text-sm text-blue-900">
                    {formatTime(subEvent.checkoutStart)} às {formatTime(subEvent.checkoutEnd)}
                  </p>
                </div>
              </div>

              {subEvent.latitude != null && subEvent.longitude != null && (
                <button
                  type="button"
                  onClick={() => openMap(subEvent.latitude, subEvent.longitude)}
                  className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-2"
                >
                  <MapPin size={14} /> Ver no mapa
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventDetails;
