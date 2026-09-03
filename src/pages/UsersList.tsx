import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '@/services';
import type { UserRequest, UserResponse } from '@/types';
import { semesterLabel } from '@/utils/semester';
import Button from '@/components/common/Button';
import DeleteUserModal from '@/components/common/DeleteUserModal';
import UserForm from '@/components/common/UserForm';
import Toast from '@/components/common/Toast';

const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'STUDENT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado do formulário de criar/editar
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    user: UserResponse | null;
  }>({
    isOpen: false,
    user: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do toast de notificação
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ isVisible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Carrega usuários
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Não foi possível carregar a lista de usuários. Tente novamente.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];

    if (roleFilter !== 'ALL') {
      result = result.filter(user => user.role === roleFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        user =>
          user.name.toLowerCase().includes(search) ||
          user.email?.toLowerCase().includes(search) ||
          user.ra?.toLowerCase().includes(search)
      );
    }

    setFilteredUsers(result);
  }, [users, roleFilter, searchTerm]);

  const handleOpenDeleteModal = (user: UserResponse) => {
    setDeleteModal({
      isOpen: true,
      userId: user.id,
      userName: user.name,
    });
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({
        isOpen: false,
        userId: null,
        userName: '',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.userId) return;

    try {
      setIsDeleting(true);
      await userService.deleteUser(deleteModal.userId);
      
      setUsers(prev => prev.filter(u => u.id !== deleteModal.userId));
      showToast('Usuário excluído com sucesso!', 'success');
      
      handleCloseDeleteModal();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Não foi possível excluir o usuário. Tente novamente.';
      showToast(errorMessage, 'error');
      console.error('Erro ao excluir usuário:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Abre modal para criar usuário
  const handleOpenCreateModal = () => {
    setFormModal({
      isOpen: true,
      user: null,
    });
  };

  // Abre modal para editar usuário
  const handleOpenEditModal = (user: UserResponse) => {
    setFormModal({
      isOpen: true,
      user: user,
    });
  };

  // Fecha modal de formulário
  const handleCloseFormModal = () => {
    if (!isSubmitting) {
      setFormModal({
        isOpen: false,
        user: null,
      });
    }
  };

  // Submit do formulário (criar ou editar)
  const handleFormSubmit = async (data: UserRequest) => {
    try {
      setIsSubmitting(true);
      
      if (formModal.user) {
        // Editar usuário existente
        const updated = await userService.updateUser(formModal.user.id, data);
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        showToast('Usuário atualizado com sucesso!', 'success');
      } else {
        // Criar novo usuário
        const created = await userService.createUser(data);
        setUsers(prev => [...prev, created]);
        showToast('Usuário criado com sucesso!', 'success');
      }
      
      handleCloseFormModal();
    } catch (err: any) {
      let errorMessage = 'Não foi possível salvar o usuário. Verifique os dados e tente novamente.';
      
      // Tratamento de erros específicos
      if (err.response?.status === 409 || err.response?.data?.message?.includes('já cadastrado')) {
        errorMessage = 'Este email já está cadastrado. Use outro email.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Dados inválidos. Verifique os campos e tente novamente.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showToast(errorMessage, 'error');
      console.error('Erro ao salvar usuário:', err);
      throw err; // Permite que o formulário trate o erro
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-800',
      STUDENT: 'bg-blue-100 text-blue-800',
    };

    const labels = {
      ADMIN: 'Administrador',
      STUDENT: 'Aluno',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gerenciamento de Usuários
        </h1>
        <p className="text-gray-600">
          Gerencie todos os usuários do sistema
        </p>
      </div>

      {/* Barra de ações e filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            {/* Busca */}
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
            />

            {/* Filtro por role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent bg-white"
            >
              <option value="ALL">Todos os perfis</option>
              <option value="ADMIN">Administradores</option>
              <option value="STUDENT">Alunos</option>
            </select>
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/import')}
              className="px-4 py-2 rounded-lg border border-[#B7294A] text-[#B7294A] hover:bg-[#B7294A] hover:text-white transition-colors whitespace-nowrap"
            >
              Importar alunos
            </button>

            <Button
              onClick={handleOpenCreateModal}
              className="whitespace-nowrap"
            >
              + Novo Usuário
            </Button>
          </div>
        </div>

        {/* Contador */}
        <div className="mt-4 text-sm text-gray-600">
          Exibindo {filteredUsers.length} de {users.length} usuário(s)
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">Erro ao carregar usuários</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Tentar novamente
            </button>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabela de usuários */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || roleFilter !== 'ALL'
              ? 'Nenhum usuário encontrado com os filtros aplicados'
              : 'Nenhum usuário cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perfil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Turma
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{user.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{user.ra || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {user.classGroupName ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {user.classGroupName}
                            {user.semester && (
                              <span className="text-gray-500"> · {semesterLabel(user.semester)}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{user.courseName}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="px-3 py-1 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          className="px-3 py-1 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      <DeleteUserModal
        isOpen={deleteModal.isOpen}
        userName={deleteModal.userName}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
        isDeleting={isDeleting}
      />

      {/* Modal de criar/editar usuário */}
      <UserForm
        isOpen={formModal.isOpen}
        user={formModal.user}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Toast de notificação */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default UsersList;
