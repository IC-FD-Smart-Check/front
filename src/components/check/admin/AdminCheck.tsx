import React, { useState, useEffect } from 'react';
import { checkService } from '@/services';
import CheckStats from '@/components/check/shared/CheckStats';
import CheckFilters from './CheckFilters';
import CheckTable from './CheckTable';
import CheckCards from './CheckCards';
import type { CheckResponse } from '@/types';
import { useToast } from '@/hooks/useToast';
import PageLoader from '@/components/common/PageLoader';
import Toast from '@/components/common/Toast';

const AdminCheck: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('ALL');
  const [checkRecords, setCheckRecords] = useState<CheckResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCheckHistory();
  }, []);

  const loadCheckHistory = async () => {
    setIsLoading(true);
    try {
      const records = await checkService.getHistory();
      setCheckRecords(records);
    } catch (err) {
      showToast('Erro ao carregar histórico de check-ins', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = checkRecords.filter((record) => {
    const matchesSearch = record.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'ALL' || record.eventTitle === filterEvent;
    return matchesSearch && matchesEvent;
  });

  // Cards de resumo derivados dos registros JÁ filtrados, para refletirem o
  // filtro de evento/busca (antes eram calculados uma vez sobre o total — BUG-007).
  const stats = {
    totalCheckins: filteredRecords.length,
    presentCount: filteredRecords.filter((r) => r.checkinTime).length,
    checkoutCount: filteredRecords.filter((r) => r.checkoutTime).length,
  };

  const uniqueEvents = Array.from(
    new Map(checkRecords.map((record) => [record.eventTitle, record.eventTitle])).values()
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {isLoading ? (
        <PageLoader message="Carregando check-ins..." />
      ) : (
        <>
          {/* Stats Cards */}
          <CheckStats
            totalEvents={stats.totalCheckins}
            totalCheckIns={stats.presentCount}
            totalCheckOuts={stats.checkoutCount}
            eventsLabel="Registros"
          />

          {/* Filtros */}
          <CheckFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterEvent={filterEvent}
            onFilterChange={setFilterEvent}
            availableEvents={uniqueEvents}
          />

          {/* Tabela de Registros */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Histórico de Check-ins
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Tabela Desktop */}
            <CheckTable records={filteredRecords} />

            {/* Cards Mobile */}
            <CheckCards records={filteredRecords} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCheck;