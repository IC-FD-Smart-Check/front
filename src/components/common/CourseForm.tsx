import React, { useEffect, useState } from 'react';
import type { CourseRequest, CourseResponse } from '@/types';
import Input from '@/components/common/Input';

interface CourseFormProps {
  isOpen: boolean;
  course: CourseResponse | null; // null = criar, objeto = editar
  /** Nome sugerido ao criar (usado pelo atalho da tela de importação) */
  defaultName?: string;
  onClose: () => void;
  onSubmit: (data: CourseRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const emptyForm = { name: '', durationInSemesters: '' };

const CourseForm: React.FC<CourseFormProps> = ({
  isOpen,
  course,
  defaultName,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  // durationInSemesters fica como string no form para permitir campo vazio
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!course;

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        durationInSemesters: String(course.durationInSemesters),
      });
    } else {
      setFormData({ ...emptyForm, name: defaultName ?? '' });
    }
    setErrors({});
  }, [course, defaultName, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do curso é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter no mínimo 3 caracteres';
    }

    const duration = Number(formData.durationInSemesters);
    if (!formData.durationInSemesters) {
      newErrors.durationInSemesters = 'Duração é obrigatória';
    } else if (!Number.isInteger(duration) || duration < 1 || duration > 14) {
      newErrors.durationInSemesters = 'Duração deve ser um número entre 1 e 14 semestres';
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
        durationInSemesters: Number(formData.durationInSemesters),
      });
      handleClose();
    } catch (error) {
      // Erro é tratado no componente pai
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData(emptyForm);
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
            {isEditMode ? 'Editar Curso' : 'Novo Curso'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isEditMode
              ? 'Atualize as informações do curso'
              : 'Preencha os dados para criar um novo curso'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Curso <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Ex.: Análise e Desenvolvimento de Sistemas"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                disabled={isSubmitting}
              />
            </div>

            {/* Duração */}
            <div>
              <label htmlFor="durationInSemesters" className="block text-sm font-medium text-gray-700 mb-1">
                Duração (semestres) <span className="text-red-500">*</span>
              </label>
              <select
                id="durationInSemesters"
                name="durationInSemesters"
                value={formData.durationInSemesters}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="">Selecione a duração</option>
                {Array.from({ length: 14 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? 'semestre' : 'semestres'}
                  </option>
                ))}
              </select>
              {errors.durationInSemesters && (
                <p className="text-red-500 text-sm mt-1">{errors.durationInSemesters}</p>
              )}
              {isEditMode && (
                <p className="text-xs text-gray-500 mt-1">
                  Não é possível reduzir a duração abaixo do semestre de turmas já cadastradas.
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#B7294A] text-white hover:bg-[#9a1f3d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? isEditMode
                  ? 'Salvando...'
                  : 'Criando...'
                : isEditMode
                ? 'Salvar Alterações'
                : 'Criar Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseForm;
