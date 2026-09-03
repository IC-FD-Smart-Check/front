import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { profileService } from '@/services';
import { useAuthStore } from '@/store/authStore';

interface RegisterEmailModalProps {
  isOpen: boolean;
}

/**
 * Pede o email de quem entrou no sistema sem ter um cadastrado
 * (caso dos alunos importados, que só têm RA).
 * Reaparece a cada novo acesso enquanto o email não for informado.
 */
const RegisterEmailModal: React.FC<RegisterEmailModalProps> = ({ isOpen }) => {
  const { user, updateUser, dismissEmailPrompt } = useAuthStore();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();

    if (!trimmed) {
      setError('Informe seu email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Email inválido');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const updated = await profileService.updateEmail(trimmed);

      if (user) {
        updateUser({ ...user, email: updated.email });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Não foi possível salvar o email. Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-[#B7294A]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cadastre seu email</h2>
              <p className="text-sm text-gray-600 mt-1">
                {user?.ra
                  ? `Você entrou com o RA ${user.ra} e ainda não tem um email cadastrado.`
                  : 'Sua conta ainda não tem um email cadastrado.'}{' '}
                O email é usado para recuperar a senha e receber avisos dos eventos.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label htmlFor="profileEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="profileEmail"
            type="email"
            autoFocus
            placeholder="seu.email@exemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSaving}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent transition-all disabled:opacity-50 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

          <p className="text-xs text-gray-500 mt-3">
            Você continua entrando no sistema com o RA. O email não substitui o seu login.
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={dismissEmailPrompt}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Agora não
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-[#B7294A] text-white hover:bg-[#9a1f3d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEmailModal;
