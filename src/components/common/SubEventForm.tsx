import React, { useState, useEffect } from 'react';
import { SubEventRequest, SubEventResponse, EventResponse } from '@/types';
import {
  buildSchedule,
  shortDateTime,
  CHECKIN_OPENS_BEFORE_MIN,
  CHECKIN_CLOSES_AFTER_MIN,
  CHECKOUT_OPENS_BEFORE_MIN,
  CHECKOUT_CLOSES_AFTER_MIN,
} from '@/utils/subEventSchedule';
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

  // Data + horários: o usuário preenche isto; as 4 janelas saem daqui
  const [schedule, setSchedule] = useState({
    date: '',
    endDate: '',      // só usado quando a atividade vira o dia
    startTime: '',
    endTime: '',
  });
  const [multiDay, setMultiDay] = useState(false);
  /** true = janelas seguem os horários automaticamente */
  const [autoWindows, setAutoWindows] = useState(true);
  const [showWindows, setShowWindows] = useState(false);

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

  // Sempre que data/horário mudam e as janelas estão no automático, recalcula tudo
  useEffect(() => {
    if (!autoWindows) return;

    const derived = buildSchedule(
      schedule.date,
      schedule.startTime,
      schedule.endTime,
      multiDay ? schedule.endDate : undefined
    );
    if (!derived) return;

    setFormData((prev) => ({ ...prev, ...derived }));
  }, [schedule, multiDay, autoWindows]);

  // Preenche o formulário quando edita
  useEffect(() => {
    if (subEvent) {
      const hasParentLocation = 
        !!parentEvent.latitude && 
        !!parentEvent.longitude && 
        subEvent.latitude === parentEvent.latitude && 
        subEvent.longitude === parentEvent.longitude;
      
      setUseParentLocation(hasParentLocation);
      
      const start = new Date(subEvent.startDate);
      const end = new Date(subEvent.endDate);
      const iso = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return {
          date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        };
      };
      const s0 = iso(start);
      const e0 = iso(end);

      setSchedule({ date: s0.date, endDate: e0.date, startTime: s0.time, endTime: e0.time });
      setMultiDay(s0.date !== e0.date);

      // Se as janelas salvas são exatamente as que o padrão geraria, mantém no
      // automático (mexer no horário continua ajustando tudo). Se foram
      // customizadas, respeita e desliga o automático.
      const padrao = buildSchedule(s0.date, s0.time, e0.time, e0.date);
      const igual =
        padrao !== null &&
        formatDateTimeLocal(subEvent.checkinStart) === padrao.checkinStart &&
        formatDateTimeLocal(subEvent.checkinEnd) === padrao.checkinEnd &&
        formatDateTimeLocal(subEvent.checkoutStart) === padrao.checkoutStart &&
        formatDateTimeLocal(subEvent.checkoutEnd) === padrao.checkoutEnd;
      setAutoWindows(igual);
      setShowWindows(!igual);

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
      setSchedule({ date: '', endDate: '', startTime: '', endTime: '' });
      setMultiDay(false);
      setAutoWindows(true);
      setShowWindows(false);
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

          {/* Quando acontece */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-900">Quando acontece</h4>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={multiDay}
                  onChange={(e) => {
                    setMultiDay(e.target.checked);
                    if (!e.target.checked) {
                      setSchedule((prev) => ({ ...prev, endDate: prev.date }));
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-4 h-4 accent-[#B7294A]"
                />
                Termina em outro dia
              </label>
            </div>

            <div className={`grid grid-cols-1 gap-3 ${multiDay ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {multiDay ? 'Data de início *' : 'Data *'}
                </label>
                <input
                  type="date"
                  value={schedule.date}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      date: e.target.value,
                      endDate: multiDay ? prev.endDate : e.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>

              {multiDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de término *</label>
                  <input
                    type="date"
                    value={schedule.endDate}
                    onChange={(e) => setSchedule((prev) => ({ ...prev, endDate: e.target.value }))}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Começa às *</label>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, startTime: e.target.value }))}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Termina às *</label>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, endTime: e.target.value }))}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            {(errors.startDate || errors.endDate) && (
              <p className="text-sm text-red-600">{errors.startDate || errors.endDate}</p>
            )}

            {/* Resumo das janelas derivadas */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-medium text-gray-900">Janelas de presença</p>
                  {formData.checkinStart && formData.checkoutEnd ? (
                    <>
                      <p>
                        Check-in: <strong>{shortDateTime(formData.checkinStart)}</strong> até{' '}
                        <strong>{shortDateTime(formData.checkinEnd)}</strong>
                      </p>
                      <p>
                        Check-out: <strong>{shortDateTime(formData.checkoutStart)}</strong> até{' '}
                        <strong>{shortDateTime(formData.checkoutEnd)}</strong>
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Preencha a data e os horários acima.</p>
                  )}
                  {autoWindows && (
                    <p className="text-xs text-gray-500">
                      Abre {CHECKIN_OPENS_BEFORE_MIN} min antes e fecha {CHECKIN_CLOSES_AFTER_MIN} min
                      depois do início; o check-out segue a mesma regra em torno do término (
                      {CHECKOUT_OPENS_BEFORE_MIN} / {CHECKOUT_CLOSES_AFTER_MIN} min).
                    </p>
                  )}
                  {!autoWindows && (
                    <p className="text-xs text-amber-700">Janelas ajustadas manualmente.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowWindows((prev) => !prev)}
                  disabled={isSubmitting}
                  className="text-sm text-[#B7294A] hover:underline whitespace-nowrap flex-shrink-0"
                >
                  {showWindows ? 'Ocultar ajuste' : 'Ajustar'}
                </button>
              </div>

              {showWindows && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      ['checkinStart', 'Check-in abre'],
                      ['checkinEnd', 'Check-in fecha'],
                      ['checkoutStart', 'Check-out abre'],
                      ['checkoutEnd', 'Check-out fecha'],
                    ] as const).map(([campo, rotulo]) => (
                      <div key={campo}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{rotulo} *</label>
                        <input
                          type="datetime-local"
                          value={formData[campo]}
                          onChange={(e) => {
                            setAutoWindows(false);
                            handleChange(campo, e.target.value);
                          }}
                          disabled={isSubmitting}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 ${
                            errors[campo] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[campo] && <p className="mt-1 text-xs text-red-600">{errors[campo]}</p>}
                      </div>
                    ))}
                  </div>

                  {!autoWindows && (
                    <button
                      type="button"
                      onClick={() => setAutoWindows(true)}
                      disabled={isSubmitting}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Voltar para os horários automáticos
                    </button>
                  )}
                </div>
              )}
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
