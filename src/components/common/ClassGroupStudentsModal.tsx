import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { classGroupService } from '@/services';
import type { ClassGroupResponse, UserResponse } from '@/types';
import { semesterLabel } from '@/utils/semester';
import PageLoader from './PageLoader';

interface ClassGroupStudentsModalProps {
  isOpen: boolean;
  classGroup: ClassGroupResponse | null;
  onClose: () => void;
}

const ClassGroupStudentsModal: React.FC<ClassGroupStudentsModalProps> = ({
  isOpen,
  classGroup,
  onClose,
}) => {
  const [students, setStudents] = useState<UserResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !classGroup) return;

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSearch('');
        const data = await classGroupService.getStudents(classGroup.id);
        if (active) setStudents(data);
      } catch (err: any) {
        if (active) setError(err.response?.data?.message || 'Não foi possível carregar os alunos.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isOpen, classGroup]);

  if (!isOpen || !classGroup) return null;

  const term = search.trim().toLowerCase();
  const filtered = term
    ? students.filter(
        (student) =>
          student.name.toLowerCase().includes(term) ||
          (student.ra?.toLowerCase().includes(term) ?? false) ||
          (student.email?.toLowerCase().includes(term) ?? false)
      )
    : students;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85dvh] flex flex-col">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-[#B7294A]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{classGroup.name}</h2>
              <p className="text-sm text-gray-600">
                {classGroup.courseName} · {semesterLabel(classGroup.semester)}
                {!loading && ` · ${students.length} aluno${students.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {students.length > 0 && (
            <input
              type="text"
              placeholder="Buscar por nome, RA ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
            />
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <PageLoader message="Carregando alunos..." />
          ) : error ? (
            <div className="m-6 bg-red-50 border-l-4 border-red-500 rounded p-4 text-sm text-red-700">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {students.length === 0
                ? 'Nenhum aluno vinculado a esta turma ainda.'
                : 'Nenhum aluno encontrado com essa busca.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RA
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-600">
                      {student.ra || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{student.name}</td>
                    <td className="px-6 py-2.5 text-sm text-gray-600">
                      {student.email || <span className="text-gray-400">sem email</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassGroupStudentsModal;
