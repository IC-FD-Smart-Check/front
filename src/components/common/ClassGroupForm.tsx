import React, { useEffect, useState } from 'react';
import type { ClassGroupRequest, ClassGroupResponse, CourseResponse, Semester } from '@/types';
import { semesterLabel, semestersForDuration } from '@/utils/semester';
import Input from '@/components/common/Input';

/** Valores sugeridos ao criar uma turma (usado pelo atalho da tela de importação) */
export interface ClassGroupFormDefaults {
  name?: string;
  externalCode?: string;
  semester?: Semester | '';
  courseId?: string;
}

interface ClassGroupFormProps {
  isOpen: boolean;
  classGroup: ClassGroupResponse | null; // null = criar, objeto = editar
  courses: CourseResponse[];
  defaults?: ClassGroupFormDefaults;
  onClose: () => void;
  onSubmit: (data: ClassGroupRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const ClassGroupForm: React.FC<ClassGroupFormProps> = ({
  isOpen,
  classGroup,
  courses,
  defaults,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    externalCode: '',
    semester: '' as Semester | '',
    courseId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!classGroup;

  const selectedCourse = courses.find((course) => course.id === formData.courseId);
  // Os semestres disponíveis dependem da duração do curso escolhido
  const availableSemesters = selectedCourse
    ? semestersForDuration(selectedCourse.durationInSemesters)
    : [];

  useEffect(() => {
    if (classGroup) {
      setFormData({
        name: classGroup.name,
        externalCode: classGroup.externalCode ?? '',
        semester: classGroup.semester,
        courseId: classGroup.courseId,
      });
    } else {
      setFormData({
        name: defaults?.name ?? '',
        externalCode: defaults?.externalCode ?? '',
        semester: defaults?.semester ?? '',
        courseId: defaults?.courseId ?? '',
      });
    }
    setErrors({});
  }, [classGroup, defaults, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      // Trocar de curso pode invalidar o semestre já escolhido
      if (name === 'courseId') {
        const course = courses.find((item) => item.id === value);
        const stillValid =
          prev.semester !== '' &&
          course !== undefined &&
          semestersForDuration(course.durationInSemesters).includes(prev.semester);

        return { ...prev, courseId: value, semester: stillValid ? prev.semester : '' };
      }

      return { ...prev, [name]: value };
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.courseId) {
      newErrors.courseId = 'Curso é obrigatório';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da turma é obrigatório';
    }

    if (!formData.semester) {
      newErrors.semester = 'Semestre é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit({
        name: formData.name.trim(),
        externalCode: formData.externalCode.trim(),
        semester: formData.semester as Semester,
        courseId: formData.courseId,
      });
      handleClose();
    } catch (error) {
      // Erro é tratado no componente pai
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', externalCode: '', semester: '', courseId: '' });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Editar Turma' : 'Nova Turma'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isEditMode
              ? 'Atualize as informações da turma'
              : 'Preencha os dados para criar uma nova turma'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Curso */}
            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
                Curso <span className="text-red-500">*</span>
              </label>
              <select
                id="courseId"
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                disabled={isSubmitting || courses.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="">
                  {courses.length === 0 ? 'Nenhum curso cadastrado' : 'Selecione o curso'}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              {errors.courseId && <p className="text-red-500 text-sm mt-1">{errors.courseId}</p>}
              {courses.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Cadastre um curso antes de criar turmas.
                </p>
              )}
            </div>

            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Turma <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Ex.: ADS 2026.1 A"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                disabled={isSubmitting}
              />
            </div>

            {/* Identificador para importação */}
            <div>
              <label htmlFor="externalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Identificador da turma
              </label>
              <Input
                id="externalCode"
                name="externalCode"
                type="text"
                placeholder="Ex.: ENGSW-2026-1-A"
                value={formData.externalCode}
                onChange={handleChange}
                error={errors.externalCode}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Código usado para vincular os alunos a esta turma na importação. Use exatamente o
                mesmo valor que o sistema de origem exporta.
              </p>
            </div>

            {/* Semestre */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                Semestre <span className="text-red-500">*</span>
              </label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                disabled={isSubmitting || !formData.courseId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="">
                  {formData.courseId ? 'Selecione o semestre' : 'Selecione um curso primeiro'}
                </option>
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semesterLabel(semester)}
                  </option>
                ))}
              </select>
              {errors.semester && <p className="text-red-500 text-sm mt-1">{errors.semester}</p>}
              {selectedCourse && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedCourse.name} possui {selectedCourse.durationInSemesters} semestres.
                </p>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || courses.length === 0}
              className="px-4 py-2 rounded-lg bg-[#B7294A] text-white hover:bg-[#9a1f3d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? isEditMode
                  ? 'Salvando...'
                  : 'Criando...'
                : isEditMode
                ? 'Salvar Alterações'
                : 'Criar Turma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassGroupForm;
