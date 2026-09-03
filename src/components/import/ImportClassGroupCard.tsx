import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { ImportClassGroup, ImportAction } from '@/types';
import { semesterLabel } from '@/utils/semester';

interface ImportClassGroupCardProps {
  classGroup: ImportClassGroup;
  executed: boolean;
  /** Atalho para cadastrar a turma que não tem cadastro */
  onRegisterClassGroup?: (classGroup: ImportClassGroup) => void;
}

const actionBadge: Record<ImportAction, { label: string; executedLabel: string; className: string }> = {
  CREATE: { label: 'Novo', executedLabel: 'Criado', className: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Atualizar', executedLabel: 'Atualizado', className: 'bg-blue-100 text-blue-800' },
  SKIP: { label: 'Ignorado', executedLabel: 'Ignorado', className: 'bg-orange-100 text-orange-800' },
};

const ImportClassGroupCard: React.FC<ImportClassGroupCardProps> = ({
  classGroup,
  executed,
  onRegisterClassGroup,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Cabeçalho da turma */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-start gap-3 px-4 sm:px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {isOpen ? (
          <ChevronDown size={18} className="text-gray-400 mt-1 flex-shrink-0" />
        ) : (
          <ChevronRight size={18} className="text-gray-400 mt-1 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {classGroup.externalCode || 'sem identificador'}
            </code>

            {classGroup.matched ? (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {classGroup.classGroupName}
                {classGroup.classGroupSemester && ` · ${semesterLabel(classGroup.classGroupSemester)}`}
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Turma não cadastrada
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-1">
            {classGroup.matched ? classGroup.courseName : classGroup.fileCourseName}
            {classGroup.filePeriod && ` · ${classGroup.filePeriod} (arquivo)`}
          </p>
        </div>

        <span className="text-sm text-gray-500 whitespace-nowrap mt-1">
          {classGroup.students.length} aluno{classGroup.students.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Avisos */}
      {classGroup.warnings.length > 0 && (
        <div className="mx-4 sm:mx-6 mb-4 bg-yellow-50 border-l-4 border-yellow-400 rounded p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="space-y-1">
              {classGroup.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-yellow-800">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>

            {!classGroup.matched && onRegisterClassGroup && (
              <button
                type="button"
                onClick={() => onRegisterClassGroup(classGroup)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#B7294A] text-white text-sm font-medium hover:bg-[#9a1f3d] transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Plus size={16} />
                Cadastrar esta turma
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alunos */}
      {isOpen && (
        <div className="border-t border-gray-200 max-h-96 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RA
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Senha inicial
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {classGroup.students.map((student) => {
                const badge = actionBadge[student.action];
                return (
                  <tr key={student.ra} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                      {student.ra}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{student.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                        {executed ? badge.executedLabel : badge.label}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm">
                      {student.generatedPassword ? (
                        <code className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {student.generatedPassword}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          {student.action === 'UPDATE' ? 'mantém a atual' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ImportClassGroupCard;
