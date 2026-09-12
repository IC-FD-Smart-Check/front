import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, KeyRound } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/hooks';
import type { ForgotPasswordResponse } from '@/types';

/**
 * Moldura da página. Fica FORA do componente de propósito: definida dentro,
 * seria um tipo novo a cada render, o React remontaria a árvore inteira a
 * cada tecla e o input perderia o foco.
 */
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

/**
 * Recuperação de senha por e-mail ou RA.
 *
 * A resposta do servidor é sempre a mesma, exista ou não a conta: a tela
 * nunca confirma nem nega um cadastro.
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

  if (result) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
            <MailCheck size={28} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
          <p className="text-sm text-gray-600">{result.message}</p>
          <p className="text-xs text-gray-500 mt-3">
            O link vale por 30 minutos. Se sua conta não tem e-mail cadastrado, procure a coordenação.
          </p>
        </div>
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
