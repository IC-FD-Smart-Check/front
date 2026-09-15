import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, CheckCircle2, LogOut, FileText } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Logo from '@/components/common/Logo';
import { profileService, termsService } from '@/services';
import TermsContent from '@/components/common/TermsContent';
import type { TermsDocument } from '@/types';
import { termsPending } from '@/utils/firstAccess';
import { useAuthStore } from '@/store/authStore';

/**
 * Primeiro acesso: aceite dos termos, troca de senha e cadastro de e-mail.
 *
 * Não tem "agora não". Enquanto isto não for concluído, o backend responde
 * 428 em todo o resto do sistema — a tela só reflete a regra que já vale no
 * servidor. As duas etapas aparecem só quando faltam: quem já tem e-mail vê
 * apenas a senha.
 */
const FirstAccess: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const precisaSenha = !!user?.mustChangePassword;
  const precisaEmail = !user?.email;
  // Mesma regra que a rota protegida e o interceptor usam, de uma fonte só.
  const precisaTermos = !!user && termsPending(user);

  // O `user` do storage pode ser de antes do deploy e não trazer a pendência
  // real. /me é liberado durante o primeiro acesso, então vale a fonte oficial.
  useEffect(() => {
    profileService.getProfile().then(updateUser).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [email, setEmail] = useState('');
  const [aceitou, setAceitou] = useState(false);
  // Versão que estava na tela no momento do aceite; o servidor confere.
  const [versaoLida, setVersaoLida] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const validar = (): string | null => {
    if (precisaTermos) {
      if (!versaoLida) return 'Aguarde os termos carregarem';
      if (!aceitou) return 'É necessário aceitar os termos de uso para continuar';
    }
    if (precisaSenha) {
      if (!senhaAtual) return 'Informe a senha atual';
      if (senhaNova.length < 6) return 'A nova senha deve ter no mínimo 6 caracteres';
      if (senhaNova === senhaAtual) return 'A nova senha deve ser diferente da atual';
      if (senhaNova !== confirmacao) return 'As senhas não conferem';
    }
    if (precisaEmail) {
      const v = email.trim();
      if (!v) return 'Informe seu e-mail';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'E-mail inválido';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    if (!user) return;

    setErro('');
    setSalvando(true);
    try {
      let atualizado = { ...user };

      // Termos primeiro: é o registro que precisa existir antes de qualquer
      // uso do sistema, e é o passo que não depende de nada digitado.
      if (precisaTermos && versaoLida) {
        const perfil = await termsService.accept(versaoLida);
        atualizado = { ...atualizado, acceptedTermsVersion: perfil.acceptedTermsVersion };
      }

      // E-mail depois: se a senha falhar em seguida, o e-mail já ficou salvo
      // e o usuário não precisa digitá-lo de novo.
      if (precisaEmail) {
        const perfil = await profileService.updateEmail(email.trim());
        atualizado = { ...atualizado, email: perfil.email };
      }
      if (precisaSenha) {
        await profileService.updatePassword(senhaAtual, senhaNova);
        atualizado = { ...atualizado, mustChangePassword: false };
      }

      updateUser(atualizado);
      navigate('/home', { replace: true });
    } catch (err: any) {
      setErro(err?.response?.data?.message || err?.message || 'Não foi possível concluir. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Nada pendente: não há o que fazer aqui.
  if (user && !precisaSenha && !precisaEmail && !precisaTermos) {
    navigate('/home', { replace: true });
    return null;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 p-4 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md">
        <div className="flex justify-center items-center mb-4">
          <div className="w-36 sm:w-48">
            <Logo />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Primeiro acesso</h2>
          <p className="text-sm text-gray-600">
            Olá, {user?.name?.split(' ')[0]}. Antes de continuar, precisamos de{' '}
            {[
              precisaTermos && 'do seu aceite aos termos de uso',
              precisaSenha && 'de uma nova senha',
              precisaEmail && 'do seu e-mail',
            ]
              .filter(Boolean)
              .join(', ')
              .replace(/,([^,]*)$/, ' e$1')}
            .
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{erro}</div>
          )}

          {precisaTermos && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Termos de uso
              </legend>

              {/* Rolagem própria: o texto é longo e não pode empurrar os
                  campos para fora da tela no celular. */}
              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                <TermsContent onLoad={(doc: TermsDocument) => setVersaoLida(doc.version)} />
              </div>

              <label className="flex items-start gap-2.5 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceitou}
                  onChange={(e) => { setAceitou(e.target.checked); setErro(''); }}
                  disabled={salvando || !versaoLida}
                  className="mt-0.5 w-4 h-4 text-[#B7294A] border-gray-300 rounded focus:ring-[#B7294A]"
                />
                <span className="text-sm text-gray-800">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <FileText size={14} className="flex-shrink-0" />
                    Li e aceito os termos de uso
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Inclui o aviso sobre a foto, a localização e o endereço de rede registrados
                    a cada check-in.
                  </span>
                </span>
              </label>
            </fieldset>
          )}

          {precisaSenha && (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Nova senha
              </legend>
              <p className="text-xs text-gray-500 -mt-1 mb-1">
                A senha que você recebeu é provisória e precisa ser trocada.
              </p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                <Input
                  type="password"
                  name="currentPassword"
                  placeholder="Senha atual (provisória)"
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(e) => { setSenhaAtual(e.target.value); setErro(''); }}
                  disabled={salvando}
                  className="pl-11"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                <Input
                  type="password"
                  name="newPassword"
                  placeholder="Nova senha"
                  autoComplete="new-password"
                  value={senhaNova}
                  onChange={(e) => { setSenhaNova(e.target.value); setErro(''); }}
                  disabled={salvando}
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
                  disabled={salvando}
                  className="pl-11"
                />
              </div>
            </fieldset>
          )}

          {precisaEmail && (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Seu e-mail
              </legend>
              <p className="text-xs text-gray-500 -mt-1 mb-1">
                Usado para recuperar a senha. Você continua entrando com o RA.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                <Input
                  type="email"
                  name="email"
                  placeholder="seu.email@exemplo.com"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(''); }}
                  disabled={salvando}
                  className="pl-11"
                />
              </div>
            </fieldset>
          )}

          <Button type="submit" fullWidth disabled={salvando}>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={18} />
              {salvando ? 'Salvando...' : 'Concluir e entrar'}
            </span>
          </Button>

          <button
            type="button"
            onClick={() => logout().then(() => navigate('/login', { replace: true }))}
            className="flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-gray-700 mt-1"
          >
            <LogOut size={16} /> Sair
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstAccess;
