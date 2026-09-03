import React, { useState, useEffect } from 'react';
import { checkService } from '@/services';
import CheckStats from '@/components/check/shared/CheckStats';
import CheckFilters from './CheckFilters';
import CheckTable from './CheckTable';
import CheckCards from './CheckCards';
import type { CheckResponse } from '@/types';
import { useToast } from '@/hooks/useToast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import Toast from '@/components/common/Toast';

const AdminCheck: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('ALL');
  const [checkRecords, setCheckRecords] = useState<CheckResponse[]>([]);
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
      const records = await checkService.getHistory();
      setCheckRecords(records);

      const checkIns = records.filter((r) => r.checkinTime).length;
      const checkOuts = records.filter((r) => r.checkoutTime).length;

      setStats({
        totalCheckins: records.length,
        presentCount: checkIns,
        checkoutCount: checkOuts,
      });
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

  const uniqueEvents = Array.from(
    new Map(checkRecords.map((record) => [record.eventTitle, record.eventTitle])).values()
  );

  return (
    <div className="relative space-y-6">
      <LoadingOverlay isVisible={isLoading} />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      {/* Stats Cards */}
      <CheckStats
        totalEvents={stats.totalCheckins}
        totalCheckIns={stats.presentCount}
        totalCheckOuts={stats.checkoutCount}
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
    </div>
  );
};

export default AdminCheck;