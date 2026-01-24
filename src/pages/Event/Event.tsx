import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '@/services';
import { EventRequest, EventResponse } from '@/types';
import Button from '@/components/common/Button';
import DeleteEventModal from '@/components/common/DeleteEventModal';
import EventForm from '@/components/common/EventForm';
import Toast from '@/components/common/Toast';

const Event: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventTitle: string;
  }>({
    isOpen: false,
    eventId: null,
    eventTitle: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado do formulário de criar/editar
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    event: EventResponse | null;
  }>({
    isOpen: false,
    event: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do toast de notificação
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ isVisible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Carrega eventos
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventService.getAllEvents();
      setEvents(data);
      setFilteredEvents(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Não foi possível carregar a lista de eventos. Tente novamente.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    let result = [...events];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        event =>
          event.title.toLowerCase().includes(search) ||
          (event.description && event.description.toLowerCase().includes(search))
      );
    }

    setFilteredEvents(result);
  }, [events, searchTerm]);

  const handleOpenDeleteModal = (event: EventResponse) => {
    setDeleteModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
    });
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({
        isOpen: false,
        eventId: null,
        eventTitle: '',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.eventId) return;

    try {
      setIsDeleting(true);
      await eventService.deleteEvent(deleteModal.eventId);
      
      setEvents(prev => prev.filter(e => e.id !== deleteModal.eventId));
      showToast('Evento excluído com sucesso!', 'success');
      
      handleCloseDeleteModal();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Não foi possível excluir o evento. Tente novamente.';
      showToast(errorMessage, 'error');
      console.error('Erro ao excluir evento:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Abre modal para criar evento
  const handleOpenCreateModal = () => {
    setFormModal({
      isOpen: true,
      event: null,
    });
  };

  // Abre modal para editar evento
  const handleOpenEditModal = (event: EventResponse) => {
    setFormModal({
      isOpen: true,
      event: event,
    });
  };

  // Fecha modal de formulário
  const handleCloseFormModal = () => {
    if (!isSubmitting) {
      setFormModal({
        isOpen: false,
        event: null,
      });
    }
  };

  // Submit do formulário (criar ou editar)
  const handleFormSubmit = async (data: EventRequest) => {
    try {
      setIsSubmitting(true);
      
      if (formModal.event) {
        // Editar evento existente
        const updated = await eventService.updateEvent(formModal.event.id, data);
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
        showToast('Evento atualizado com sucesso!', 'success');
      } else {
        // Criar novo evento
        const created = await eventService.createEvent(data);
        setEvents(prev => [...prev, created]);
        showToast('Evento criado com sucesso!', 'success');
      }
      
      handleCloseFormModal();
    } catch (err: any) {
      let errorMessage = 'Não foi possível salvar o evento. Verifique os dados e tente novamente.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Dados inválidos. Verifique os campos e tente novamente.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showToast(errorMessage, 'error');
      console.error('Erro ao salvar evento:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando eventos...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gerenciamento de Eventos
        </h1>
        <p className="text-gray-600">
          Gerencie todos os eventos do sistema
        </p>
      </div>

      {/* Barra de ações e filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            {/* Busca */}
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
            />
          </div>

          {/* Botão Novo Evento */}
          <Button
            onClick={handleOpenCreateModal}
            className="whitespace-nowrap"
          >
            + Novo Evento
          </Button>
        </div>

        {/* Contador */}
        <div className="mt-4 text-sm text-gray-600">
          Exibindo {filteredEvents.length} de {events.length} evento(s)
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">Erro ao carregar eventos</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Tentar novamente
            </button>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Lista de eventos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm
              ? 'Nenhum evento encontrado com os filtros aplicados'
              : 'Nenhum evento cadastrado'}
          </div>
        ) : (
          <>
            {/* Visualização Desktop - Tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Início
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Término
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-gray-900">
                          {event.title}
                        </div>
                        {(event.latitude && event.longitude) && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-600 max-w-md">
                          {event.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(event.startDate)}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(event.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => navigate(`/events/${event.id}/subevents`)}
                            className="px-3 py-1 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-600 rounded-lg transition-colors"
                          >
                            Subeventos
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(event)}
                            className="px-3 py-1 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(event)}
                            className="px-3 py-1 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visualização Mobile - Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[60px]">Início:</span>
                      <span className="text-gray-900">{formatDate(event.startDate)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[60px]">Término:</span>
                      <span className="text-gray-900">{formatDate(event.endDate)}</span>
                    </div>
                    {(event.latitude && event.longitude) && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 min-w-[60px]">Local:</span>
                        <div className="flex items-center gap-1 text-gray-900 text-xs">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/events/${event.id}/subevents`)}
                      className="flex-1 px-3 py-2 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      Subeventos
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(event)}
                      className="flex-1 px-3 py-2 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(event)}
                      className="flex-1 px-3 py-2 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      <DeleteEventModal
        isOpen={deleteModal.isOpen}
        eventTitle={deleteModal.eventTitle}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
        isDeleting={isDeleting}
      />

      {/* Modal de criar/editar evento */}
      <EventForm
        isOpen={formModal.isOpen}
        event={formModal.event}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Toast de notificação */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default Event;
