import React from 'react';
import { Calendar, Clock, History } from 'lucide-react';
import Button from '@/components/common/Button';
import CheckStats from '@/components/check/shared/CheckStats';
import type { CheckResponse } from '@/types';

interface CheckHistoryProps {
  records: CheckResponse[];
  stats: {
    totalEvents: number;
    totalCheckIns: number;
    totalCheckOuts: number;
  };
  onBackToCheckin: () => void;
}

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

const CheckHistory: React.FC<CheckHistoryProps> = ({ records, stats, onBackToCheckin }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <CheckStats
        totalEvents={stats.totalEvents}
        totalCheckIns={stats.totalCheckIns}
        totalCheckOuts={stats.totalCheckOuts}
      />

      {/* Lista de Registros */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200 flex items-baseline justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Meus Check-ins</h3>
          <p className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
            {records.length} registro{records.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="mb-3 sm:mb-4">
                  <span className="inline-block max-w-full truncate text-xs sm:text-sm font-medium text-[#B7294A] bg-[#B7294A]/10 px-2 py-1 rounded mb-1.5">
                    {record.eventTitle}
                  </span>
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
                    {record.subEventTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Calendar size={15} className="flex-shrink-0" />
                    <span className="text-sm capitalize">{formatDate(record.createdAt)}</span>
                  </div>
                </div>

                {/* Horários lado a lado mesmo no celular: são valores curtos */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {/* Check-in */}
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                      <p className="text-xs text-green-700 font-medium">Check-in</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={15} className="text-green-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-semibold text-green-900 tabular-nums">
                        {record.checkinTime ? formatTime(record.checkinTime) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Check-out */}
                  <div
                    className={`rounded-lg p-3 border min-w-0 ${
                      record.checkoutTime
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
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
                    <div className="flex items-center gap-1.5">
                      <Clock
                        size={15}
                        className={`flex-shrink-0 ${record.checkoutTime ? 'text-red-600' : 'text-gray-400'}`}
                      />
                      <span
                        className={`text-sm sm:text-base font-semibold tabular-nums ${
                          record.checkoutTime ? 'text-red-900' : 'text-gray-500'
                        }`}
                      >
                        {record.checkoutTime ? formatTime(record.checkoutTime) : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 sm:px-6 py-10 sm:py-12 text-center">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Você ainda não fez check-in em nenhum evento</p>
              <Button onClick={onBackToCheckin} className="mt-4 w-full sm:w-auto">
                Fazer Check-in
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckHistory;
