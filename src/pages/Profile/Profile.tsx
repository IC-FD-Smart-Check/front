import React, { useState } from 'react';
import { Mail, KeyRound } from 'lucide-react';
import { profileService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Toast from '@/components/common/Toast';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();

  const [email, setEmail] = useState(user?.email ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Email inválido');
      return;
    }

    try {
      setSavingEmail(true);
      setEmailError(null);
      const updated = await profileService.updateEmail(trimmed);
      if (user) updateUser({ ...user, email: updated.email });
      setEmail(updated.email ?? trimmed);
      showToast('Email atualizado com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Não foi possível salvar o email.', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!passwords.current) errors.current = 'Informe a senha atual';
    if (!passwords.next) errors.next = 'Informe a nova senha';
    else if (passwords.next.length < 6) errors.next = 'A nova senha deve ter no mínimo 6 caracteres';
    if (passwords.next !== passwords.confirm) errors.confirm = 'As senhas não conferem';

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSavingPassword(true);
      await profileService.updatePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      showToast('Senha alterada com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Não foi possível alterar a senha.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const changePassword = (field: 'current' | 'next' | 'confirm', value: string) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) setPasswordErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Meu Perfil</h1>
        <p className="text-sm sm:text-base text-gray-600">Atualize seu email e sua senha de acesso</p>
      </div>

      {/* Identificação (somente leitura) */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[#B7294A] font-bold text-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 leading-snug break-words">{user?.name}</h2>
            <p className="text-sm text-gray-600">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Estudante'}
              {user?.ra && ` · RA ${user.ra}`}
            </p>
            {user?.classGroupName && (
              <p className="text-xs text-gray-500 mt-0.5 break-words">
                {user.classGroupName} · {user.courseName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Email */}
      <form onSubmit={handleSubmitEmail} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-[#B7294A]" />
          <h2 className="text-lg font-semibold text-gray-900">Email</h2>
        </div>

        {!user?.email && (
          <p className="text-sm text-yellow-800 bg-yellow-50 border-l-4 border-yellow-400 rounded p-3 mb-4">
            Você ainda não tem um email cadastrado. Ele é usado para recuperar a senha.
          </p>
        )}

        <Input
          id="email"
          name="email"
          type="email"
          placeholder="seu.email@exemplo.com"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          error={emailError ?? undefined}
          disabled={savingEmail}
        />

        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={savingEmail || email.trim() === (user?.email ?? '')}
          >
            {savingEmail ? 'Salvando...' : 'Salvar email'}
          </Button>
        </div>
      </form>

      {/* Senha */}
      <form onSubmit={handleSubmitPassword} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-[#B7294A]" />
          <h2 className="text-lg font-semibold text-gray-900">Alterar senha</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-gray-700 mb-1">
              Senha atual <span className="text-red-500">*</span>
            </label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => changePassword('current', e.target.value)}
              error={passwordErrors.current}
              disabled={savingPassword}
            />
          </div>

          <div>
            <label htmlFor="next" className="block text-sm font-medium text-gray-700 mb-1">
              Nova senha <span className="text-red-500">*</span>
            </label>
            <Input
              id="next"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(e) => changePassword('next', e.target.value)}
              error={passwordErrors.next}
              disabled={savingPassword}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nova senha <span className="text-red-500">*</span>
            </label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => changePassword('confirm', e.target.value)}
              error={passwordErrors.confirm}
              disabled={savingPassword}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button type="submit" className="w-full sm:w-auto" disabled={savingPassword}>
            {savingPassword ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </div>
      </form>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
};

export default Profile;
