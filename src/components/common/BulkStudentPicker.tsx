import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Users } from 'lucide-react';
import { classGroupService, courseService, userService } from '@/services';
import type { ClassGroupResponse, CourseResponse, Semester, UserResponse } from '@/types';
import { semesterLabel } from '@/utils/semester';
import Button from './Button';
import PageLoader from './PageLoader';

interface BulkStudentPickerProps {
  /** IDs já inscritos — exibidos marcados e sem seleção */
  subscribedUserIds: Set<string>;
  isSubmitting: boolean;
  onSubscribe: (userIds: string[]) => Promise<void>;
  onError: (message: string) => void;
  /** Texto do botão; por padrão "Inscrever N alunos" */
  submitLabel?: string;
}

const selectClass =
  'w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent bg-white';

const BulkStudentPicker: React.FC<BulkStudentPickerProps> = ({
  subscribedUserIds,
  isSubmitting,
  onSubscribe,
  onError,
  submitLabel,
}) => {
  const [students, setStudents] = useState<UserResponse[]>([]);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [courseId, setCourseId] = useState('ALL');
  const [classGroupId, setClassGroupId] = useState('ALL');
  const [semester, setSemester] = useState<Semester | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [users, courseList, classGroupList] = await Promise.all([
          userService.getAllUsers(),
          courseService.getAllCourses(),
          classGroupService.getAllClassGroups(),
        ]);
        setStudents(users.filter((user) => user.role === 'STUDENT'));
        setCourses(courseList);
        setClassGroups(classGroupList);
      } catch (err: any) {
        onError(err.response?.data?.message || 'Erro ao carregar alunos');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Turmas do curso escolhido
  const availableClassGroups = useMemo(
    () => (courseId === 'ALL' ? classGroups : classGroups.filter((cg) => cg.courseId === courseId)),
    [classGroups, courseId]
  );

  // Semestres que existem nas turmas visíveis
  const availableSemesters = useMemo(() => {
    const set = new Map<Semester, number>();
    availableClassGroups.forEach((cg) => set.set(cg.semester, cg.semesterNumber));
    return [...set.entries()].sort((a, b) => a[1] - b[1]).map(([s]) => s);
  }, [availableClassGroups]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((student) => {
      if (courseId !== 'ALL' && student.courseId !== courseId) return false;
      if (classGroupId !== 'ALL' && student.classGroupId !== classGroupId) return false;
      if (semester !== 'ALL' && student.semester !== semester) return false;

      if (term) {
        const matches =
          student.name.toLowerCase().includes(term) ||
          (student.ra?.toLowerCase().includes(term) ?? false) ||
          (student.email?.toLowerCase().includes(term) ?? false);
        if (!matches) return false;
      }

      return true;
    });
  }, [students, courseId, classGroupId, semester, search]);

  // Só quem ainda não está inscrito pode ser selecionado
  const selectable = useMemo(
    () => filtered.filter((student) => !subscribedUserIds.has(student.id)),
    [filtered, subscribedUserIds]
  );

  const allSelected = selectable.length > 0 && selectable.every((s) => selected.has(s.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectable.forEach((s) => next.delete(s.id));
      } else {
        selectable.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleCourseChange = (value: string) => {
    setCourseId(value);
    setClassGroupId('ALL');
    setSemester('ALL');
  };

  const handleSubscribe = async () => {
    if (selected.size === 0) return;
    await onSubscribe([...selected]);
    setSelected(new Set());
  };

  const clearFilters = () => {
    setCourseId('ALL');
    setClassGroupId('ALL');
    setSemester('ALL');
    setSearch('');
  };

  const hasFilters = courseId !== 'ALL' || classGroupId !== 'ALL' || semester !== 'ALL' || !!search;

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <Filter size={14} />
            Filtrar alunos
          </span>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Colunas iguais: os três selects lado a lado quando há espaço */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className={selectClass}
            aria-label="Curso"
          >
            <option value="ALL">Todos os cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>

          <select
            value={classGroupId}
            onChange={(e) => setClassGroupId(e.target.value)}
            className={selectClass}
            aria-label="Turma"
          >
            <option value="ALL">Todas as turmas</option>
            {availableClassGroups.map((cg) => (
              <option key={cg.id} value={cg.id}>{cg.name}</option>
            ))}
          </select>

          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value as Semester | 'ALL')}
            className={selectClass}
            aria-label="Semestre"
          >
            <option value="ALL">Todos os semestres</option>
            {availableSemesters.map((s) => (
              <option key={s} value={s}>{semesterLabel(s)}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Buscar por nome, RA ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
        />
      </div>

      {/* Barra de seleção */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectable.length === 0 || isSubmitting}
            className="w-4 h-4 accent-[#B7294A]"
          />
          Selecionar todos ({selectable.length})
        </label>

        <span className="text-sm text-gray-600 whitespace-nowrap">
          {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      <div className="border border-gray-200 rounded-lg max-h-[min(26rem,32vh)] overflow-y-auto">
        {loading ? (
          <PageLoader compact message="Carregando alunos..." />
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            {students.length === 0 ? 'Nenhum aluno cadastrado.' : 'Nenhum aluno com esses filtros.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((student) => {
              const already = subscribedUserIds.has(student.id);
              return (
                <li key={student.id}>
                  <label
                    className={`flex items-center gap-3 px-3 py-2 ${
                      already ? 'opacity-60' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={already || selected.has(student.id)}
                      disabled={already || isSubmitting}
                      onChange={() => toggle(student.id)}
                      className="w-4 h-4 accent-[#B7294A] flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 break-words">{student.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {student.ra ? `RA ${student.ra}` : student.email}
                        {student.classGroupName && ` · ${student.classGroupName}`}
                      </p>
                    </div>
                    {already && (
                      <span className="text-[11px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                        inscrito
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button onClick={handleSubscribe} disabled={selected.size === 0 || isSubmitting} fullWidth>
        <span className="flex items-center justify-center gap-2">
          <Users size={16} />
          {isSubmitting
            ? 'Inscrevendo...'
            : submitLabel
            ? `${submitLabel}${selected.size > 0 ? ` (${selected.size})` : ''}`
            : selected.size === 0
            ? 'Inscrever alunos'
            : selected.size === 1
            ? 'Inscrever 1 aluno'
            : `Inscrever ${selected.size} alunos`}
        </span>
      </Button>
    </div>
  );
};

export default BulkStudentPicker;
