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

const CheckHistory: React.FC<CheckHistoryProps> = ({ records, stats, onBackToCheckin }) => {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <CheckStats
        totalEvents={stats.totalEvents}
        totalCheckIns={stats.totalCheckIns}
        totalCheckOuts={stats.totalCheckOuts}
      />

      {/* Lista de Registros */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Meus Check-ins</h3>
          <p className="text-sm text-gray-600 mt-1">
            {records.length} evento{records.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-medium text-[#B7294A] bg-[#B7294A]/10 px-2 py-1 rounded">
                        {record.eventTitle}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                      {record.subEventTitle}
                    </h4>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Calendar size={16} />
                      <span className="text-sm">
                        {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Check-in */}
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <p className="text-xs text-green-700 font-medium">Check-in</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-900">
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
                    className={`rounded-lg p-3 border ${
                      record.checkoutTime
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
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
                    <div className="flex items-center gap-2">
                      <Clock
                        size={16}
                        className={record.checkoutTime ? 'text-red-600' : 'text-gray-400'}
                      />
                      <span
                        className={`text-sm font-semibold ${
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
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Você ainda não fez check-in em nenhum evento</p>
              <Button onClick={onBackToCheckin} className="mt-4">
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