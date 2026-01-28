import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { CheckResponse } from '@/types';

interface CheckCardsProps {
  records: CheckResponse[];
}

const CheckCards: React.FC<CheckCardsProps> = ({ records }) => {
  return (
    <div className="md:hidden divide-y divide-gray-200">
      {records.length > 0 ? (
        records.map((record) => (
          <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{record.userName}</p>
                <p className="text-sm text-gray-500">{record.userId}</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-2">
              {/* Evento / Subevento */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Evento:</span>
                  <span className="text-xs font-medium text-[#B7294A] bg-[#B7294A]/10 px-2 py-0.5 rounded">
                    {record.eventTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subevento:</span>
                  <span className="font-medium text-gray-900">{record.subEventTitle}</span>
                </div>
              </div>

              {/* Data */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Data:</span>
                <div className="flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-gray-700">
                    {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Check-in / Check-out */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {/* Check-in */}
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <p className="text-xs text-green-700 font-medium">Check-in</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-green-600" />
                    <span className="text-xs font-semibold text-green-900">
                      {record.checkinTime
                        ? new Date(record.checkinTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* Check-out */}
                <div
                  className={`rounded-lg p-2 border ${
                    record.checkoutTime
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        record.checkoutTime ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                    />
                    <p
                      className={`text-xs font-medium ${
                        record.checkoutTime ? 'text-red-700' : 'text-gray-600'
                      }`}
                    >
                      Check-out
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock
                      size={12}
                      className={record.checkoutTime ? 'text-red-600' : 'text-gray-400'}
                    />
                    <span
                      className={`text-xs font-semibold ${
                        record.checkoutTime ? 'text-red-900' : 'text-gray-500'
                      }`}
                    >
                      {record.checkoutTime
                        ? new Date(record.checkoutTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">Nenhum registro encontrado</p>
        </div>
      )}
    </div>
  );
};

export default CheckCards;