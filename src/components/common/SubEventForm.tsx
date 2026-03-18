import React, { useState, useEffect } from 'react';
import { SubEventRequest, SubEventResponse, EventResponse } from '@/types';
import Button from './Button';
import Input from './Input';
import LocationPicker from './LocationPicker';

interface SubEventFormProps {
  isOpen: boolean;
  subEvent: SubEventResponse | null;
  parentEvent: EventResponse;
  onClose: () => void;
  onSubmit: (data: SubEventRequest) => Promise<void>;
  isSubmitting: boolean;
}

const SubEventForm: React.FC<SubEventFormProps> = ({
  isOpen,
  subEvent,
  parentEvent,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<SubEventRequest>({
    title: '',
    description: '',
    latitude: undefined,
    longitude: undefined,
    radius: undefined,
    locationDescription: '',
    startDate: '',
    endDate: '',
    checkinStart: '',
    checkinEnd: '',
    checkoutStart: '',
    checkoutEnd: '',
    eventId: parentEvent.id,
  });

  const [useParentLocation, setUseParentLocation] = useState(false);

  const [errors, setErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
    checkinStart?: string;
    checkinEnd?: string;
    checkoutStart?: string;
    checkoutEnd?: string;
    location?: string;
  }>({});

  // Converte ISO 8601 para datetime-local format
  const formatDateTimeLocal = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Converte datetime-local para naive datetime string (sem timezone)
  // Envia como "2026-03-18T14:30:00" — o backend trata tudo como America/Sao_Paulo
  const formatToISO = (dateTimeLocal: string): string => {
    if (!dateTimeLocal) return '';
    // datetime-local retorna "YYYY-MM-DDTHH:mm", backend espera "YYYY-MM-DDTHH:mm:ss"
    return dateTimeLocal.length === 16 ? `${dateTimeLocal}:00` : dateTimeLocal;
  };

  // Preenche o formulário quando edita
  useEffect(() => {
    if (subEvent) {
      const hasParentLocation = 
        !!parentEvent.latitude && 
        !!parentEvent.longitude && 
        subEvent.latitude === parentEvent.latitude && 
        subEvent.longitude === parentEvent.longitude;
      
      setUseParentLocation(hasParentLocation);
      
      setFormData({
        title: subEvent.title,
        description: subEvent.description || '',
        latitude: subEvent.latitude,
        longitude: subEvent.longitude,
        radius: subEvent.radius,
        locationDescription: subEvent.locationDescription || '',
        startDate: formatDateTimeLocal(subEvent.startDate),
        endDate: formatDateTimeLocal(subEvent.endDate),
        checkinStart: formatDateTimeLocal(subEvent.checkinStart),
        checkinEnd: formatDateTimeLocal(subEvent.checkinEnd),
        checkoutStart: formatDateTimeLocal(subEvent.checkoutStart),
        checkoutEnd: formatDateTimeLocal(subEvent.checkoutEnd),
        eventId: parentEvent.id,
      });
    } else {
      // Reset ao criar novo
      setUseParentLocation(false);
      setFormData({
        title: '',
        description: '',
        latitude: undefined,
        longitude: undefined,
        radius: undefined,
        locationDescription: '',
        startDate: '',
        endDate: '',
        checkinStart: '',
        checkinEnd: '',
        checkoutStart: '',
        checkoutEnd: '',
        eventId: parentEvent.id,
      });
    }
    setErrors({});
  }, [subEvent, parentEvent, isOpen]);

  // Atualiza localização quando checkbox muda
  useEffect(() => {
    if (useParentLocation && parentEvent.latitude && parentEvent.longitude) {
      setFormData(prev => ({
        ...prev,
        latitude: parentEvent.latitude,
        longitude: parentEvent.longitude,
        radius: parentEvent.radius,
      }));
    } else if (!useParentLocation && subEvent === null) {
      // Limpa localização apenas se estiver criando novo
      setFormData(prev => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
        radius: undefined,
      }));
    }
  }, [useParentLocation, parentEvent, subEvent]);

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

    if (!formData.checkinStart) {
      newErrors.checkinStart = 'Início do check-in é obrigatório';
    }

    if (!formData.checkinEnd) {
      newErrors.checkinEnd = 'Término do check-in é obrigatório';
    }

    if (!formData.checkoutStart) {
      newErrors.checkoutStart = 'Início do checkout é obrigatório';
    }

    if (!formData.checkoutEnd) {
      newErrors.checkoutEnd = 'Término do checkout é obrigatório';
    }

    // Validação de localização (obrigatória)
    if (!formData.latitude || !formData.longitude) {
      newErrors.title = newErrors.title || 'Localização é obrigatória. Por favor, defina as coordenadas no mapa.';
    }

    if (!formData.radius || formData.radius <= 0) {
      newErrors.title = newErrors.title || 'Raio de localização é obrigatório e deve ser maior que zero.';
    }

    // Validação de ordem de datas
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'Data de término deve ser posterior à data de início';
      }
    }

    if (formData.checkinStart && formData.checkinEnd) {
      const start = new Date(formData.checkinStart);
      const end = new Date(formData.checkinEnd);
      if (end <= start) {
        newErrors.checkinEnd = 'Término do check-in deve ser posterior ao início';
      }
    }

    if (formData.checkoutStart && formData.checkoutEnd) {
      const start = new Date(formData.checkoutStart);
      const end = new Date(formData.checkoutEnd);
      if (end <= start) {
        newErrors.checkoutEnd = 'Término do checkout deve ser posterior ao início';
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
      const dataToSend: SubEventRequest = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        radius: formData.radius ? Number(formData.radius) : undefined,
        locationDescription: formData.locationDescription?.trim() || undefined,
        startDate: formatToISO(formData.startDate),
        endDate: formatToISO(formData.endDate),
        checkinStart: formatToISO(formData.checkinStart),
        checkinEnd: formatToISO(formData.checkinEnd),
        checkoutStart: formatToISO(formData.checkoutStart),
        checkoutEnd: formatToISO(formData.checkoutEnd),
        eventId: parentEvent.id,
      };

      await onSubmit(dataToSend);
    } catch (err) {
      console.error('Erro ao submeter formulário:', err);
    }
  };

  const handleChange = (field: keyof SubEventRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {subEvent ? 'Editar Subevento' : 'Novo Subevento'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Evento: <span className="font-medium">{parentEvent.title}</span>
            </p>
          </div>
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
              placeholder="Ex: Palestra de IA"
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
              placeholder="Informações adicionais sobre o subevento..."
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

          {/* Horários de Check-in */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Janelas de Check-in *
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Início do Check-in
                </label>
                <input
                  type="datetime-local"
                  value={formData.checkinStart}
                  onChange={(e) => handleChange('checkinStart', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.checkinStart ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkinStart && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkinStart}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Término do Check-in
                </label>
                <input
                  type="datetime-local"
                  value={formData.checkinEnd}
                  onChange={(e) => handleChange('checkinEnd', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.checkinEnd ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkinEnd && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkinEnd}</p>
                )}
              </div>
            </div>
          </div>

          {/* Horários de Checkout */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Janelas de Checkout *
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Início do Checkout
                </label>
                <input
                  type="datetime-local"
                  value={formData.checkoutStart}
                  onChange={(e) => handleChange('checkoutStart', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.checkoutStart ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkoutStart && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkoutStart}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Término do Checkout
                </label>
                <input
                  type="datetime-local"
                  value={formData.checkoutEnd}
                  onChange={(e) => handleChange('checkoutEnd', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.checkoutEnd ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkoutEnd && (
                  <p className="mt-1 text-sm text-red-600">{errors.checkoutEnd}</p>
                )}
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Localização *
            </h3>
            
            {/* Checkbox para usar localização do evento pai */}
            {parentEvent.latitude && parentEvent.longitude && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="useParentLocation"
                  checked={useParentLocation}
                  onChange={(e) => setUseParentLocation(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 text-[#B7294A] border-gray-300 rounded focus:ring-[#B7294A]"
                />
                <label htmlFor="useParentLocation" className="flex-1 text-sm text-blue-800 cursor-pointer">
                  Usar a mesma localização do evento "{parentEvent.title}"
                  {parentEvent.radius && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 mt-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Lat: {parentEvent.latitude.toFixed(4)}, Lng: {parentEvent.longitude.toFixed(4)} • Raio: {parentEvent.radius}m
                    </span>
                  )}
                </label>
              </div>
            )}

            {/* Descrição do Local */}
            <div className="mb-4">
              <Input
                label="Descrição do Local"
                type="text"
                value={formData.locationDescription || ''}
                onChange={(e) => handleChange('locationDescription', e.target.value)}
                placeholder="Ex: Auditório Principal, Sala 101"
                disabled={isSubmitting}
              />
            </div>

            {/* Mapa de localização */}
            {!useParentLocation && (
              <LocationPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                radius={formData.radius}
                onChange={handleLocationChange}
                disabled={isSubmitting}
              />
            )}
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
              {isSubmitting ? 'Salvando...' : subEvent ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubEventForm;
