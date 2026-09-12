import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, UserX, ShieldAlert, KeyRound } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/hooks';
import type { ForgotPasswordResponse } from '@/types';

/**
 * Recuperação de senha por e-mail ou RA.
 *
 * A resposta do servidor diz o que aconteceu e a tela orienta de acordo.
 * Quando é e-mail, a mensagem é a mesma exista a conta ou não — quem descobre
 * é o dono da caixa de entrada, que recebe ou o link ou um aviso.
 */
const ForgotPassword: React.FC = () => {
  const { forgotPassword, loading, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) {
      setValidationError('Informe seu e-mail ou RA');
      return;
    }
    setValidationError('');
    const response = await forgotPassword({ identifier: value });
    if (response) setResult(response);
  };

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 p-4 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md">
        <div className="flex justify-center items-center mb-4">
          <div className="w-36 sm:w-48">
            <Logo />
          </div>
        </div>
        {children}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-gray-600 text-sm font-medium mt-6 hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para login
        </Link>
      </div>
    </div>
  );

  if (result) {
    const conteudo = {
      SENT: {
        icone: <MailCheck size={28} className="text-green-600" />,
        titulo: 'Verifique seu e-mail',
        texto: result.message,
        rodape: 'O link vale por 30 minutos. Se não chegar, confira o spam ou peça de novo.',
      },
      NO_EMAIL_ON_ACCOUNT: {
        icone: <ShieldAlert size={28} className="text-amber-600" />,
        titulo: 'Conta sem e-mail',
        texto: result.message,
        rodape: 'A coordenação pode gerar uma senha provisória para você.',
      },
      NOT_FOUND: {
        icone: <UserX size={28} className="text-red-600" />,
        titulo: 'RA não encontrado',
        texto: result.message,
        rodape: null,
      },
    }[result.status];

    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
            {conteudo.icone}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{conteudo.titulo}</h2>
          <p className="text-sm text-gray-600">{conteudo.texto}</p>
          {conteudo.rodape && <p className="text-xs text-gray-500 mt-3">{conteudo.rodape}</p>}
        </div>
        {result.status !== 'SENT' && (
          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full mt-5 text-sm text-[#B7294A] font-medium hover:underline"
          >
            Tentar com outro e-mail ou RA
          </button>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Esqueceu a senha?</h2>
        <p className="text-sm text-gray-600">
          Informe seu e-mail ou RA. Enviaremos um link para o e-mail cadastrado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {(error || validationError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {error || validationError}
          </div>
        )}

        <div className="relative">
          <KeyRound
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
            size={20}
          />
          <Input
            type="text"
            name="identifier"
            placeholder="E-mail ou RA"
            autoComplete="username"
            autoCapitalize="none"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              clearError();
              setValidationError('');
            }}
            disabled={loading}
            className="pl-11"
          />
        </div>

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link de redefinição'}
        </Button>
      </form>
    </Shell>
  );
};

export default ForgotPassword;
