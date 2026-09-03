import React, { useEffect, useState } from 'react';
import { UserRequest, UserResponse } from '@/types';
import Input from '@/components/common/Input';

interface UserFormProps {
  isOpen: boolean;
  user: UserResponse | null; // null = criar, objeto = editar
  onClose: () => void;
  onSubmit: (data: UserRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  user,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<UserRequest>({
    name: '',
    email: '',
    ra: '',
    password: '',
    role: 'STUDENT',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const isEditMode = !!user;

  // Preenche formulário quando editar
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email ?? '',
        ra: user.ra ?? '',
        password: '', // Senha em branco ao editar
        role: user.role,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        ra: '',
        password: '',
        role: 'STUDENT',
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpa erro do campo ao digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter no mínimo 3 caracteres';
    }

    // Email (opcional, mas se preenchido precisa ser válido)
    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Ao menos um entre email e RA é obrigatório
    if (!formData.email?.trim() && !formData.ra?.trim()) {
      newErrors.email = 'Informe email ou RA';
      newErrors.ra = 'Informe email ou RA';
    }

    // Senha (obrigatória apenas ao criar)
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
      }
    } else {
      // Ao editar, valida apenas se senha foi preenchida
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      // Remove senha do payload se estiver vazia no modo edição
      const dataToSend = { ...formData };
      if (isEditMode && !dataToSend.password) {
        delete (dataToSend as any).password;
      }
      
      await onSubmit(dataToSend as UserRequest);
      handleClose();
    } catch (error) {
      // Erro é tratado no componente pai
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', email: '', ra: '', password: '', role: 'STUDENT' });
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
            {isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isEditMode
              ? 'Atualize as informações do usuário'
              : 'Preencha os dados para criar um novo usuário'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Digite o nome completo"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                disabled={isSubmitting}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                disabled={isSubmitting}
              />
            </div>

            {/* RA */}
            <div>
              <label htmlFor="ra" className="block text-sm font-medium text-gray-700 mb-1">
                RA
              </label>
              <Input
                id="ra"
                name="ra"
                type="text"
                placeholder="Número de matrícula (RA)"
                value={formData.ra}
                onChange={handleChange}
                error={errors.ra}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">Informe ao menos email ou RA.</p>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha {!isEditMode && <span className="text-red-500">*</span>}
                {isEditMode && <span className="text-gray-500 text-xs">(deixe em branco para não alterar)</span>}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isEditMode ? 'Digite para alterar a senha' : 'Digite a senha'}
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                  disabled={isSubmitting}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Perfil <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <option value="STUDENT">Aluno</option>
                <option value="ADMIN">Administrador</option>
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role}</p>
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
                : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
