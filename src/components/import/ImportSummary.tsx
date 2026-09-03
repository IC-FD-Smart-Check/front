import React from 'react';
import { FileText, UserPlus, RefreshCw, MinusCircle } from 'lucide-react';
import type { StudentImportResponse } from '@/types';

interface ImportSummaryProps {
  result: StudentImportResponse;
}

const ImportSummary: React.FC<ImportSummaryProps> = ({ result }) => {
  const executed = result.executed;

  const tiles = [
    {
      label: 'Alunos no arquivo',
      value: result.totalStudents,
      icon: FileText,
      color: '#6B7280',
    },
    {
      label: executed ? 'Criados' : 'Serão criados',
      value: result.toCreate,
      icon: UserPlus,
      color: '#4CAF50',
    },
    {
      label: executed ? 'Atualizados' : 'Serão atualizados',
      value: result.toUpdate,
      icon: RefreshCw,
      color: '#2196F3',
    },
    {
      label: executed ? 'Ignorados' : 'Serão ignorados',
      value: result.toSkip,
      icon: MinusCircle,
      color: '#FF9800',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${tile.color}20` }}
            >
              <Icon size={20} style={{ color: tile.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-600">{tile.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{tile.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ImportSummary;
