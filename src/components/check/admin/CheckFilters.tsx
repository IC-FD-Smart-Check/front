import React from 'react';
import { Search } from 'lucide-react';
import Input from '@/components/common/Input';

interface CheckFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterEvent: string;
  onFilterChange: (value: string) => void;
  availableEvents: string[];
}

const CheckFilters: React.FC<CheckFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterEvent,
  onFilterChange,
  availableEvents,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
      {/* Busca por Estudante */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pesquisar Estudante
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            placeholder="Nome ou email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filtro por Evento */}
      <div>
        <label htmlFor="filter-event" className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por Evento
        </label>
        <select
          id="filter-event"
          aria-label="Filtrar por evento"
          value={filterEvent}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A]"
        >
          <option value="ALL">Todos os Eventos</option>
          {availableEvents.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CheckFilters;