import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/hooks';
import type { ForgotPasswordRequest } from '@/types';

const ForgotPassword: React.FC = () => {
  const { forgotPassword, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validate = (): boolean => {
    if (!email) {
      setValidationError('Email é obrigatório');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Email inválido');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const request: ForgotPasswordRequest = { email };
    const success = await forgotPassword(request);
    if (success) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 p-5">
        <div className="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-md">
          <div className="text-center mb-8">
            <Logo />
            <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Solicitação enviada!</h2>
            <p className="text-sm text-gray-600">
              Sua solicitação foi enviada. Aguarde o contato para redefinir sua senha.
            </p>
          </div>

          <Link to="/login" className="flex items-center justify-center gap-2 text-gray-600 text-sm font-medium mt-4 hover:text-primary transition-colors">
            <ArrowLeft size={20} />
            Voltar para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Esqueceu a senha?</h2>
          <p className="text-sm text-gray-600">
            Digite seu email para solicitar a redefinição de senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {(error || validationError) && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-2">
              {error || validationError}
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            <Input
              type="email"
              name="email"
              placeholder="seu.email@instituicao.edu.br"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
                setValidationError('');
              }}
              disabled={loading}
              className="pl-11"
            />
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Enviando...' : 'Solicitar nova senha'}
          </Button>

          <Link to="/login" className="flex items-center justify-center gap-2 text-gray-600 text-sm font-medium mt-4 hover:text-primary transition-colors">
            <ArrowLeft size={20} />
            Voltar para login
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;