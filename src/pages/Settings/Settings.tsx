import React, { useEffect, useState } from 'react';
import {
  Network,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Info,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { settingsService } from '@/services';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import PageLoader from '@/components/common/PageLoader';
import Toast from '@/components/common/Toast';
import type { AllowedNetwork } from '@/types';

/**
 * Configurações do sistema.
 *
 * Hoje tem uma única seção: as redes de onde o check-in é aceito. A
 * instituição sai para a internet por vários links dedicados, e cada link
 * chega ao servidor com um IP próprio — é isso que se cadastra aqui.
 *
 * A validação não é automática: cada subevento diz se exige a rede, porque
 * existem atividades fora da instituição.
 */
const Settings: React.FC = () => {
  const [networks, setNetworks] = useState<AllowedNetwork[]>([]);
  const [currentIp, setCurrentIp] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({ isVisible: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') =>
    setToast({ isVisible: true, message, type });

  const carregar = async () => {
    try {
      setLoading(true);
      const [lista, ip] = await Promise.all([
        settingsService.listAllowedNetworks(),
        settingsService.currentIp().catch(() => ''),
      ]);
      setNetworks(lista);
      setCurrentIp(ip);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || 'Não foi possível carregar as configurações.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      showToast('Informe o IP ou a faixa.', 'warning');
      return;
    }
    try {
      setSalvando(true);
      const criada = await settingsService.createAllowedNetwork({
        value: value.trim(),
        description: description.trim() || undefined,
      });
      setNetworks((prev) => [...prev, criada]);
      setValue('');
      setDescription('');
      showToast('Rede cadastrada.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Não foi possível cadastrar.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (network: AllowedNetwork) => {
    try {
      const atualizada = await settingsService.setAllowedNetworkActive(
        network.id,
        !network.active,
      );
      setNetworks((prev) => prev.map((n) => (n.id === atualizada.id ? atualizada : n)));
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Não foi possível alterar.', 'error');
    }
  };

  const remover = async (network: AllowedNetwork) => {
    try {
      setRemovendo(network.id);
      await settingsService.deleteAllowedNetwork(network.id);
      setNetworks((prev) => prev.filter((n) => n.id !== network.id));
      showToast('Rede removida.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Não foi possível remover.', 'error');
    } finally {
      setRemovendo(null);
    }
  };

  const ativas = networks.filter((n) => n.active).length;
  const ipJaCadastrado = networks.some((n) => n.value === currentIp);

  if (loading) {
    return <PageLoader message="Carregando configurações..." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">
          Ajustes que valem para todo o sistema
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
            <Network size={18} className="text-[#B7294A]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900">Redes que podem fazer check-in</h2>
            <p className="text-sm text-gray-500">
              {ativas === 0
                ? 'Nenhuma rede ativa. Cadastre os links dedicados da instituição.'
                : `${ativas} rede${ativas > 1 ? 's' : ''} ativa${ativas > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 flex items-start gap-2.5 bg-blue-50/50 border-b border-gray-100">
          <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 leading-relaxed">
            Esta lista só é consultada nos subeventos marcados para exigir a rede da
            instituição. Atividades fora do campus continuam aceitando check-in de qualquer
            rede. Enquanto houver subevento exigindo a rede com check-in em aberto, a última
            rede ativa não pode ser removida.
          </p>
        </div>

        {/* Cadastro */}
        <form onSubmit={adicionar} className="px-5 sm:px-6 py-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <div className="flex-1">
              <Input
                label="IP ou faixa"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="200.150.74.254 ou 200.150.74.0/24"
                disabled={salvando}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Descrição"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Link dedicado bloco A"
                disabled={salvando}
              />
            </div>
            <div className="sm:pt-7">
              <Button
                type="submit"
                disabled={salvando}
                className="flex items-center justify-center gap-2 !py-2.5 px-5 w-full sm:w-auto"
              >
                <Plus size={18} /> {salvando ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>

          {currentIp && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <MapPin size={15} className="text-gray-400" />
              <span className="text-gray-600">
                Você está acessando de <code className="font-mono text-gray-900">{currentIp}</code>
              </span>
              {ipJaCadastrado ? (
                <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                  <ShieldCheck size={14} /> já cadastrado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setValue(currentIp)}
                  className="text-[#B7294A] text-xs font-semibold hover:underline"
                >
                  usar este IP
                </button>
              )}
            </div>
          )}
        </form>

        {/* Lista */}
        {networks.length === 0 ? (
          <div className="px-5 sm:px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <WifiOff size={26} className="text-gray-300" />
            </div>
            <h3 className="font-medium text-gray-900">Nenhuma rede cadastrada</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre um IP por link dedicado. Conectado a cada link, use o botão acima para
              pegar o endereço automaticamente.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {networks.map((network) => (
              <li
                key={network.id}
                className="px-5 sm:px-6 py-4 flex items-center gap-3 sm:gap-4"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    network.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {network.active ? <Wifi size={17} /> : <WifiOff size={17} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-900 truncate">
                    {network.value}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {network.description || 'Sem descrição'}
                    {!network.active && ' · inativa'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => alternar(network)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    network.active
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {network.active ? 'Desativar' : 'Ativar'}
                </button>

                <button
                  type="button"
                  onClick={() => remover(network)}
                  disabled={removendo === network.id}
                  title="Remover"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default Settings;
