import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { CheckResponse } from '@/types';

interface CheckTableProps {
  records: CheckResponse[];
}

const CheckTable: React.FC<CheckTableProps> = ({ records }) => {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Estudante
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Evento / Subevento
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Check-in
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Check-out
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.length > 0 ? (
            records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                {/* Estudante */}
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{record.userName}</p>
                    <p className="text-sm text-gray-500">{record.userId}</p>
                  </div>
                </td>

                {/* Evento / Subevento */}
                <td className="px-6 py-4">
                  <div>
                    <span className="text-xs font-medium text-[#B7294A] bg-[#B7294A]/10 px-2 py-0.5 rounded">
                      {record.eventTitle}
                    </span>
                    <p className="text-gray-900 mt-1">{record.subEventTitle}</p>
                  </div>
                </td>

                {/* Data */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar size={16} className="text-gray-400" />
                    {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </td>

                {/* Check-in */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-700">
                      {record.checkinTime
                        ? new Date(record.checkinTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </div>
                </td>

                {/* Check-out */}
                <td className="px-6 py-4">
                  {record.checkoutTime ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        {new Date(record.checkoutTime).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Pendente</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center">
                <p className="text-gray-500">Nenhum registro encontrado</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CheckTable;