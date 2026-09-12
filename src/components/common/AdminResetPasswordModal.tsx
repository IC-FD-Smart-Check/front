import React, { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';
import { userService } from '@/services';
import type { AdminPasswordResetResponse, UserResponse } from '@/types';

interface AdminResetPasswordModalProps {
  user: UserResponse;
  onClose: () => void;
  onError?: (message: string) => void;
}

/**
 * Reset de senha pelo admin, em duas etapas: confirmar, depois exibir a senha
 * provisória. Ela aparece uma única vez — o servidor guarda só o hash — por
 * isso o botão de copiar e o aviso explícito antes de fechar.
 */
const AdminResetPasswordModal: React.FC<AdminResetPasswordModalProps> = ({ user, onClose, onError }) => {
  const [resultado, setResultado] = useState<AdminPasswordResetResponse | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const gerar = async () => {
    setGerando(true);
    try {
      setResultado(await userService.resetPassword(user.id));
    } catch (err: any) {
      onError?.(err?.response?.data?.message || 'Não foi possível redefinir a senha');
      onClose();
    } finally {
      setGerando(false);
    }
  };

  const copiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.temporaryPassword);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem clipboard (http, permissão): a senha continua visível para anotar.
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={resultado ? undefined : onClose}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
            <KeyRound size={18} className="text-[#B7294A]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">Redefinir senha</h2>
            <p className="text-sm text-gray-500 truncate">
              {user.name}
              {user.ra && ` · RA ${user.ra}`}
            </p>
          </div>
        </div>

        {!resultado ? (
          <>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
              <p>
                Será gerada uma <strong>senha provisória</strong> para este usuário. A senha atual deixa
                de valer e as sessões abertas são encerradas.
              </p>
              <p>No próximo acesso, o usuário será obrigado a definir uma senha própria.</p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button
                onClick={onClose}
                disabled={gerando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={gerar}
                disabled={gerando}
                className="px-4 py-2 rounded-lg bg-[#B7294A] text-white text-sm font-semibold hover:bg-[#9d2340] disabled:opacity-50"
              >
                {gerando ? 'Gerando...' : 'Gerar senha provisória'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Senha provisória</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xl font-mono tracking-wider bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 select-all">
                    {resultado.temporaryPassword}
                  </code>
                  <button
                    onClick={copiar}
                    title="Copiar"
                    className="p-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {copiado ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Esta senha <strong>não poderá ser consultada depois</strong>. Copie ou anote antes de
                  fechar e repasse ao usuário com cuidado.
                </p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
              >
                Já anotei, fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminResetPasswordModal;
