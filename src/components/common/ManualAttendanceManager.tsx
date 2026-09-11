import React, { useEffect, useMemo, useState } from 'react';
import { Search, Check, LogOut, Loader2, Hand, AlertTriangle } from 'lucide-react';
import { checkService } from '@/services';
import PageLoader from './PageLoader';
import type { AttendanceEntry } from '@/types';

interface ManualAttendanceManagerProps {
  isOpen: boolean;
  subEventId: string;
  subEventTitle: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

const ManualAttendanceManager: React.FC<ManualAttendanceManagerProps> = ({
  isOpen,
  subEventId,
  subEventTitle,
  onClose,
  onSuccess,
  onError,
}) => {
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [marcando, setMarcando] = useState<string | null>(null);
  // Marcação não tem como ser desfeita, então passa por confirmação.
  const [confirmacao, setConfirmacao] = useState<{
    entry: AttendanceEntry;
    type: 'CHECKIN' | 'CHECKOUT';
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !subEventId) return;

    setLoading(true);
    checkService
      .getAttendance(subEventId)
      .then(setEntries)
      .catch(() => onError?.('Erro ao carregar os inscritos'))
      .finally(() => setLoading(false));
  }, [isOpen, subEventId]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(termo) ||
        (e.ra || '').toLowerCase().includes(termo) ||
        (e.classGroupName || '').toLowerCase().includes(termo),
    );
  }, [entries, busca]);

  const resumo = useMemo(() => {
    const comCheckin = entries.filter((e) => e.checkinTime).length;
    const completos = entries.filter((e) => e.checkinTime && e.checkoutTime).length;
    return { total: entries.length, comCheckin, completos };
  }, [entries]);

  const marcar = async (entry: AttendanceEntry, type: 'CHECKIN' | 'CHECKOUT') => {
    const chave = `${entry.userId}-${type}`;
    setConfirmacao(null);
    setMarcando(chave);
    try {
      const atualizado = await checkService.markManual(subEventId, entry.userId, type);
      // Troca só a linha afetada: recarregar a lista inteira perderia o filtro
      // e a posição de rolagem no meio de uma sequência de marcações.
      setEntries((atuais) => atuais.map((e) => (e.userId === entry.userId ? atualizado : e)));
      onSuccess?.(
        `${type === 'CHECKIN' ? 'Check-in' : 'Checkout'} de ${entry.name} marcado`,
      );
    } catch (err: any) {
      onError?.(err?.response?.data?.message || 'Não foi possível marcar');
    } finally {
      setMarcando(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Hand size={18} className="text-[#B7294A]" /> Marcações manuais
            </h2>
            <p className="text-sm text-gray-500 truncate">{subEventTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 space-y-3">
          <p className="text-xs text-gray-600">
            Marcar aqui registra a presença sem QR Code, localização ou foto. Um horário que já
            existe <span className="font-medium text-gray-900">nunca é substituído</span> — só é
            possível acrescentar o que falta.
          </p>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, RA ou turma..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B7294A]/30"
              />
            </div>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              {resumo.completos}/{resumo.comCheckin}/{resumo.total}
              <span className="block text-[10px] text-gray-400">completos/entradas/inscritos</span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <PageLoader compact message="Carregando inscritos..." />
          ) : filtrados.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              {entries.length === 0 ? 'Nenhum aluno inscrito neste sub-evento' : 'Nenhum resultado'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtrados.map((entry) => (
                <li key={entry.userId} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                    <p className="text-xs text-gray-500">
                      {entry.ra ? `RA ${entry.ra}` : 'sem RA'}
                      {entry.classGroupName && ` · ${entry.classGroupName}`}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                      <span className={entry.checkinTime ? 'text-green-700' : 'text-gray-400'}>
                        Entrada: {hora(entry.checkinTime) || '—'}
                        {entry.checkinManual && ' (manual)'}
                      </span>
                      <span className={entry.checkoutTime ? 'text-blue-700' : 'text-gray-400'}>
                        Saída: {hora(entry.checkoutTime) || '—'}
                        {entry.checkoutManual && ' (manual)'}
                      </span>
                    </div>
                  </div>

                  {/* Habilitado pelo que o servidor respondeu, não por regra
                      reimplementada aqui. */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmacao({ entry, type: 'CHECKIN' })}
                      disabled={!entry.canMarkCheckin || marcando !== null}
                      title={entry.canMarkCheckin ? 'Marcar check-in' : 'Já possui check-in'}
                      className="px-3 py-1.5 rounded-lg border border-green-200 text-green-700 text-xs font-medium hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {marcando === `${entry.userId}-CHECKIN` ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Entrada
                    </button>
                    <button
                      onClick={() => setConfirmacao({ entry, type: 'CHECKOUT' })}
                      disabled={!entry.canMarkCheckout || marcando !== null}
                      title={
                        entry.canMarkCheckout
                          ? 'Marcar checkout'
                          : entry.checkinTime
                          ? 'Já possui checkout'
                          : 'Precisa de check-in antes'
                      }
                      className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-medium hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {marcando === `${entry.userId}-CHECKOUT` ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <LogOut size={14} />
                      )}
                      Saída
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>

        {/* Confirmação dentro do próprio modal, e não window.confirm: o diálogo
            do navegador trava a página e não mostra o nome do aluno. */}
        {confirmacao && (
          <div
            className="absolute inset-0 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setConfirmacao(null)}
          >
            <div
              className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Marcar {confirmacao.type === 'CHECKIN' ? 'check-in' : 'checkout'} de{' '}
                    {confirmacao.entry.name}?
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {confirmacao.entry.ra ? `RA ${confirmacao.entry.ra}` : 'sem RA'}
                    {confirmacao.entry.classGroupName && ` · ${confirmacao.entry.classGroupName}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    O registro fica marcado como manual e{' '}
                    <span className="font-medium text-gray-700">não pode ser desfeito</span>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setConfirmacao(null)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => marcar(confirmacao.entry, confirmacao.type)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#B7294A] text-white text-sm font-semibold hover:bg-[#9d2340]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualAttendanceManager;
