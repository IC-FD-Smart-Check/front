import React from 'react';
import { CheckCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import type { CheckInfoResponse } from '@/types';

interface EventConfirmationProps {
  eventInfo: CheckInfoResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const EventConfirmation: React.FC<EventConfirmationProps> = ({
  eventInfo,
  onConfirm,
  onCancel,
  isProcessing,
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] px-4 sm:px-6 py-6 sm:py-8 text-white">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <CheckCircle size={24} className="sm:w-8 sm:h-8" />
            <h2 className="text-xl sm:text-2xl font-bold">Evento Encontrado</h2>
          </div>
          <p className="text-sm sm:text-base text-white/90">
            {eventInfo.actionType === 'CHECKOUT'
              ? 'Confirme sua saída do subevento'
              : 'Confirme sua presença no subevento'}
          </p>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {/* Badge do Evento */}
            <div className="pb-3 sm:pb-4 border-b border-gray-200">
              <span className="inline-block max-w-full truncate text-xs sm:text-sm font-medium text-[#B7294A] bg-[#B7294A]/10 px-3 py-1 rounded mb-2">
                {eventInfo.eventTitle}
              </span>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Subevento</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                  {eventInfo.subEventTitle}
                </p>
                {eventInfo.subEventDescription && (
                  <p className="text-sm text-gray-600 mt-1">{eventInfo.subEventDescription}</p>
                )}
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Início</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900 tabular-nums">
                  {new Date(eventInfo.startDate).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Término</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900 tabular-nums">
                  {new Date(eventInfo.endDate).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Local */}
            {eventInfo.locationDescription && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">Local</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                  {eventInfo.locationDescription}
                </p>
              </div>
            )}

            {/* Mensagem de validação */}
            {!eventInfo.canPerformAction && eventInfo.validationMessage && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">{eventInfo.validationMessage}</p>
              </div>
            )}
          </div>

          {/* Botões */}
          {/* No celular a ação principal fica em cima, mais perto do polegar */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button onClick={onCancel} variant="secondary" fullWidth disabled={isProcessing}>
              Voltar
            </Button>
            <Button
              onClick={onConfirm}
              fullWidth
              className="py-3.5 text-base"
              disabled={isProcessing || !eventInfo.canPerformAction}
              variant={eventInfo.actionType === 'CHECKOUT' ? 'outline' : 'primary'}
            >
              {isProcessing
                ? 'Processando...'
                : `Confirmar ${eventInfo.actionType === 'CHECKIN' ? 'Check-in' : 'Check-out'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventConfirmation;