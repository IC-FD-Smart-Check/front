import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2, LinkIcon } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Logo from '@/components/common/Logo';
import { authService } from '@/services';

type Estado = 'validando' | 'invalido' | 'pronto' | 'enviando' | 'concluido';

/** Destino do link enviado por e-mail: ?token=... */
const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [estado, setEstado] = useState<Estado>('validando');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');

  // Confere o token antes de mostrar o formulário: não faz sentido pedir uma
  // senha nova para depois dizer que o link venceu.
  useEffect(() => {
    if (!token) {
      setEstado('invalido');
      return;
    }
    authService.validateResetToken(token).then((ok) => setEstado(ok ? 'pronto' : 'invalido'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem');
      return;
    }
    setErro('');
    setEstado('enviando');
    try {
      await authService.resetPassword({ token, newPassword: senha });
      setEstado('concluido');
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err: any) {
      setErro(err.message);
      setEstado('pronto');
    }
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
      </div>
    </div>
  );

  if (estado === 'validando') {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-500">Verificando o link...</p>
      </Shell>
    );
  }

  if (estado === 'invalido') {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
            <LinkIcon size={28} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Link inválido ou expirado</h2>
          <p className="text-sm text-gray-600">
            O link vale por 30 minutos e só pode ser usado uma vez. Peça uma nova redefinição.
          </p>
        </div>
        <Link
          to="/forgot-password"
          className="block text-center w-full mt-6 px-4 py-3 rounded-lg bg-[#B7294A] text-white text-sm font-semibold"
        >
          Pedir novo link
        </Link>
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-gray-600 text-sm font-medium mt-4 hover:text-primary"
        >
          <ArrowLeft size={20} /> Voltar para login
        </Link>
      </Shell>
    );
  }

  if (estado === 'concluido') {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Senha redefinida</h2>
          <p className="text-sm text-gray-600">Entre com a nova senha. Redirecionando para o login...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Nova senha</h2>
        <p className="text-sm text-gray-600">Escolha uma senha com pelo menos 6 caracteres.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{erro}</div>
        )}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
          <Input
            type="password"
            name="newPassword"
            placeholder="Nova senha"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(''); }}
            disabled={estado === 'enviando'}
            className="pl-11"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirme a nova senha"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => { setConfirmacao(e.target.value); setErro(''); }}
            disabled={estado === 'enviando'}
            className="pl-11"
          />
        </div>
        <Button type="submit" fullWidth disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </Shell>
  );
};

export default ResetPassword;
