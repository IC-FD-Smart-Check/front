import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, Search } from 'lucide-react';
import Input from '@/components/common/Input';
import { checkService } from '@/services';
import type { CheckRecord } from '@/types';

const AdminCheck: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('ALL');
  const [checkRecords, setCheckRecords] = useState<CheckRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCheckins: 0,
    presentCount: 0,
    checkoutCount: 0,
  });

  useEffect(() => {
    loadCheckHistory();
  }, []);

  const loadCheckHistory = async () => {
    setIsLoading(true);
    try {
      const data = await checkService.getCheckHistory();
      const records = Array.isArray(data) ? data : (data.records || []);
      setCheckRecords(records);
      
      // Calcular estatísticas dos registros
      const checkIns = records.filter(r => r.checkinTime).length;
      const checkOuts = records.filter(r => r.checkoutTime).length;
      
      setStats({
        totalCheckins: data.totalCheckins || records.length,
        presentCount: data.presentCount || checkIns,
        checkoutCount: data.checkoutCount || checkOuts,
      });
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = checkRecords.filter((record) => {
    const matchesSearch =
      record.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'ALL' || record.eventTitle === filterEvent;
    return matchesSearch && matchesEvent;
  });

  const uniqueEvents = Array.from(
    new Map(checkRecords.map((record) => [record.eventTitle, record.eventTitle])).values()
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total de Check-ins</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalCheckins}</p>
            </div>
            <CheckCircle size={40} className="text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Presentes</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.presentCount}</p>
            </div>
            <User size={40} className="text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Check-outs</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats.checkoutCount}</p>
            </div>
            <XCircle size={40} className="text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pesquisar Estudante
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Evento
          </label>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A]"
          >
            <option value="ALL">Todos os Eventos</option>
            {uniqueEvents.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Check-in Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Histórico de Check-ins</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Tabela desktop / Cards mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estudante</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Evento / Subevento</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Check-in</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Check-out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{record.userName}</p>
                        <p className="text-sm text-gray-500">{record.userId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-xs font-medium text-[#B7294A] bg-[#B7294A]/10 px-2 py-0.5 rounded">
                          {record.eventTitle}
                        </span>
                        <p className="text-gray-900 mt-1">{record.subEventTitle}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={16} className="text-gray-400" />
                        {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-gray-700">
                          {record.checkinTime ? new Date(record.checkinTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.checkoutTime ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <Clock size={16} className="text-gray-400" />
                          <span className="text-gray-700">
                            {new Date(record.checkoutTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-gray-500">Nenhum registro encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{record.userName}</p>
                    <p className="text-sm text-gray-500">{record.userId}</p>
                  </div>
                </div>

                <div className="space-y-2">
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

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Data:</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-gray-700">{new Date(record.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <p className="text-xs text-green-700 font-medium">Check-in</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-900">
                          {record.checkinTime ? new Date(record.checkinTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className={`rounded-lg p-2 border ${
                      record.checkoutTime 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          record.checkoutTime ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <p className={`text-xs font-medium ${
                          record.checkoutTime ? 'text-red-700' : 'text-gray-600'
                        }`}>
                          Check-out
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className={record.checkoutTime ? 'text-red-600' : 'text-gray-400'} />
                        <span className={`text-xs font-semibold ${
                          record.checkoutTime ? 'text-red-900' : 'text-gray-500'
                        }`}>
                          {record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Pendente'}
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
      </div>
    </div>
  );
};

export default AdminCheck;
