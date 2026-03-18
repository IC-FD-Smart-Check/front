import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { subEventService, eventService } from '@/services';
import { SubEventRequest, SubEventResponse, EventResponse } from '@/types';
import Button from '@/components/common/Button';
import SubEventForm from '@/components/common/SubEventForm';
import QRCodeManager from '@/components/common/QRCodeManager';
import SubscriptionManager from '@/components/common/SubscriptionManager';
import Toast from '@/components/common/Toast';

const SubEventList: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [subEvents, setSubEvents] = useState<SubEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    subEvent: SubEventResponse | null;
  }>({
    isOpen: false,
    subEvent: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qrCodeModal, setQrCodeModal] = useState<{
    isOpen: boolean;
    subEvent: SubEventResponse | null;
  }>({
    isOpen: false,
    subEvent: null,
  });

  const [subscriptionModal, setSubscriptionModal] = useState<{
    isOpen: boolean;
    subEvent: SubEventResponse | null;
  }>({
    isOpen: false,
    subEvent: null,
  });

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

  const fetchData = async () => {
    if (!eventId) {
      setError('ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [eventData, subEventsData] = await Promise.all([
        eventService.getEventById(eventId),
        subEventService.getSubEventsByEventId(eventId),
      ]);

      setEvent(eventData);
      setSubEvents(subEventsData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao carregar dados. Tente novamente.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const handleOpenCreateModal = () => {
    setFormModal({
      isOpen: true,
      subEvent: null,
    });
  };

  const handleOpenEditModal = (subEvent: SubEventResponse) => {
    setFormModal({
      isOpen: true,
      subEvent: subEvent,
    });
  };

  const handleCloseFormModal = () => {
    if (!isSubmitting) {
      setFormModal({
        isOpen: false,
        subEvent: null,
      });
    }
  };

  const handleOpenQRCodeModal = (subEvent: SubEventResponse) => {
    setQrCodeModal({
      isOpen: true,
      subEvent: subEvent,
    });
  };

  const handleCloseQRCodeModal = () => {
    setQrCodeModal({
      isOpen: false,
      subEvent: null,
    });
  };

  const handleOpenSubscriptionModal = (subEvent: SubEventResponse) => {
    setSubscriptionModal({ isOpen: true, subEvent });
  };

  const handleCloseSubscriptionModal = () => {
    setSubscriptionModal({ isOpen: false, subEvent: null });
  };

  const handleFormSubmit = async (data: SubEventRequest) => {
    if (!eventId || !event) return;

    try {
      setIsSubmitting(true);

      if (formModal.subEvent) {
        const updated = await subEventService.updateSubEvent(eventId, formModal.subEvent.id, data);
        setSubEvents(prev => prev.map(se => se.id === updated.id ? updated : se));
        showToast('Subevento atualizado com sucesso!', 'success');
      } else {
        const created = await subEventService.createSubEvent(eventId, data);
        setSubEvents(prev => [...prev, created]);
        showToast('Subevento criado com sucesso!', 'success');
      }

      handleCloseFormModal();
    } catch (err: any) {
      let errorMessage = 'Não foi possível salvar o subevento. Verifique os dados e tente novamente.';

      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Dados inválidos. Verifique os campos e tente novamente.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      showToast(errorMessage, 'error');
      console.error('Erro ao salvar subevento:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (subEvent: SubEventResponse) => {
    if (!eventId) return;

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o subevento "${subEvent.title}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    try {
      await subEventService.deleteSubEvent(eventId, subEvent.id);
      setSubEvents(prev => prev.filter(se => se.id !== subEvent.id));
      showToast('Subevento excluído com sucesso!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Não foi possível excluir o subevento. Tente novamente.';
      showToast(errorMessage, 'error');
      console.error('Erro ao excluir subevento:', err);
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
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-700">{error || 'Evento não encontrado'}</p>
          <button
            onClick={() => navigate('/events')}
            className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
          >
            Voltar para Eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/events')}
          className="text-[#B7294A] hover:text-[#9a2139] flex items-center gap-2 mb-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Eventos
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Subeventos de "{event.title}"
        </h1>
        <p className="text-gray-600">
          {formatDate(event.startDate)} até {formatDate(event.endDate)}
        </p>
      </div>

      {/* Barra de ações */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="text-sm text-gray-600">
            {subEvents.length} subevento(s) cadastrado(s)
          </div>

          <Button onClick={handleOpenCreateModal} className="whitespace-nowrap">
            + Novo Subevento
          </Button>
        </div>
      </div>

      {/* Lista de subeventos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {subEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Nenhum subevento cadastrado</p>
            <Button onClick={handleOpenCreateModal}>
              Criar Primeiro Subevento
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subEvents.map((subEvent) => (
              <div key={subEvent.id} className="p-6 hover:bg-gray-50 transition-colors">
                {/* Cabeçalho do card */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {subEvent.title}
                    </h3>
                    {subEvent.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {subEvent.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 lg:flex-shrink-0">
                    <button
                      onClick={() => handleOpenSubscriptionModal(subEvent)}
                      className="px-4 py-2 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      Inscrições
                    </button>
                    <button
                      onClick={() => handleOpenQRCodeModal(subEvent)}
                      className="px-4 py-2 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      QR Codes
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(subEvent)}
                      className="px-4 py-2 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(subEvent)}
                      className="px-4 py-2 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Informações */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {/* Datas do evento */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-semibold text-gray-900">Período</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-gray-600"><span className="font-medium">Início:</span> {formatDate(subEvent.startDate)}</p>
                      <p className="text-gray-600"><span className="font-medium">Término:</span> {formatDate(subEvent.endDate)}</p>
                    </div>
                  </div>

                  {/* Check-in */}
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <p className="font-semibold text-green-900">Check-in</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-green-800"><span className="font-medium">Início:</span> {formatDate(subEvent.checkinStart)}</p>
                      <p className="text-green-800"><span className="font-medium">Término:</span> {formatDate(subEvent.checkinEnd)}</p>
                    </div>
                  </div>

                  {/* Checkout */}
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <p className="font-semibold text-blue-900">Checkout</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-blue-800"><span className="font-medium">Início:</span> {formatDate(subEvent.checkoutStart)}</p>
                      <p className="text-blue-800"><span className="font-medium">Término:</span> {formatDate(subEvent.checkoutEnd)}</p>
                    </div>
                  </div>
                </div>

                {/* Localização */}
                {((subEvent.latitude && subEvent.longitude) || subEvent.locationDescription) && (
                  <div className="mt-4 border border-purple-200 bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-semibold text-purple-900">Localização</p>
                    </div>
                    <div className="space-y-1.5">
                      {subEvent.locationDescription && (
                        <p className="text-purple-800 font-medium">{subEvent.locationDescription}</p>
                      )}
                      {subEvent.latitude && subEvent.longitude && (
                        <p className="text-sm text-purple-700">
                          Coordenadas: {subEvent.latitude.toFixed(4)}, {subEvent.longitude.toFixed(4)}
                          {subEvent.radius && ` • Raio: ${subEvent.radius}m`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criar/editar subevento */}
      {event && (
        <SubEventForm
          isOpen={formModal.isOpen}
          subEvent={formModal.subEvent}
          parentEvent={event}
          onClose={handleCloseFormModal}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Modal de gerenciar QR codes */}
      {qrCodeModal.subEvent && (
        <QRCodeManager
          isOpen={qrCodeModal.isOpen}
          subEventId={qrCodeModal.subEvent.id}
          subEventTitle={qrCodeModal.subEvent.title}
          onClose={handleCloseQRCodeModal}
          onSuccess={(message) => showToast(message, 'success')}
          onError={(message) => showToast(message, 'error')}
        />
      )}

      {/* Modal de inscrições */}
      {subscriptionModal.subEvent && (
        <SubscriptionManager
          isOpen={subscriptionModal.isOpen}
          subEventId={subscriptionModal.subEvent.id}
          subEventTitle={subscriptionModal.subEvent.title}
          onClose={handleCloseSubscriptionModal}
          onSuccess={(message) => showToast(message, 'success')}
          onError={(message) => showToast(message, 'error')}
        />
      )}

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

export default SubEventList;
