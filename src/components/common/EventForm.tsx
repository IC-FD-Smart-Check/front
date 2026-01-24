import React, { useState, useEffect } from 'react';
import { EventRequest, EventResponse } from '@/types';
import Button from './Button';
import Input from './Input';
import LocationPicker from './LocationPicker';

interface EventFormProps {
  isOpen: boolean;
  event: EventResponse | null;
  onClose: () => void;
  onSubmit: (data: EventRequest) => Promise<void>;
  isSubmitting: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  isOpen,
  event,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<EventRequest>({
    title: '',
    description: '',
    latitude: undefined,
    longitude: undefined,
    radius: undefined,
    startDate: '',
    endDate: '',
  });

  const [errors, setErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // Preenche o formulário quando edita
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        latitude: event.latitude,
        longitude: event.longitude,
        radius: event.radius,
        startDate: event.startDate ? formatDateTimeLocal(event.startDate) : '',
        endDate: event.endDate ? formatDateTimeLocal(event.endDate) : '',
      });
    } else {
      // Reset ao criar novo
      setFormData({
        title: '',
        description: '',
        latitude: undefined,
        longitude: undefined,
        radius: undefined,
        startDate: '',
        endDate: '',
      });
    }
    setErrors({});
  }, [event, isOpen]);

  // Converte ISO 8601 para datetime-local format (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Converte datetime-local para ISO 8601
  const formatToISO = (dateTimeLocal: string): string => {
    if (!dateTimeLocal) return '';
    const date = new Date(dateTimeLocal);
    return date.toISOString();
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Data de início é obrigatória';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Data de término é obrigatória';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'Data de término deve ser posterior à data de início';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // Prepara dados para enviar
      const dataToSend: EventRequest = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        radius: formData.radius ? Number(formData.radius) : undefined,
        startDate: formatToISO(formData.startDate),
        endDate: formatToISO(formData.endDate),
      };

      await onSubmit(dataToSend);
    } catch (err) {
      // Erros tratados pelo componente pai
      console.error('Erro ao submeter formulário:', err);
    }
  };

  const handleChange = (field: keyof EventRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpa erro do campo quando usuário edita
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLocationChange = (lat: number | undefined, lng: number | undefined, radius: number | undefined) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, radius: radius }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <Input
              label="Título *"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ex: Semana Acadêmica 2026"
              error={errors.title}
              disabled={isSubmitting}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Informações adicionais sobre o evento..."
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Data de Início e Fim */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início *
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Término *
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Localização com Mapa */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Localização (Opcional)
            </h3>
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              radius={formData.radius}
              onChange={handleLocationChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : event ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
