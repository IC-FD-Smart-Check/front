import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SubscriptionResponse } from '@/types';
import { subscriptionService } from '@/services';
import BulkStudentPicker from './BulkStudentPicker';

interface SubscriptionManagerProps {
  isOpen: boolean;
  subEventId: string;
  subEventTitle: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  isOpen,
  subEventId,
  subEventTitle,
  onClose,
  onSuccess,
  onError,
}) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [subscribedSearch, setSubscribedSearch] = useState('');
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());

  const filteredSubscriptions = useMemo(() => {
    const term = subscribedSearch.trim().toLowerCase();
    if (!term) return subscriptions;
    return subscriptions.filter(
      (sub) =>
        sub.userName.toLowerCase().includes(term) ||
        (sub.userEmail?.toLowerCase().includes(term) ?? false)
    );
  }, [subscriptions, subscribedSearch]);

  const allFilteredSelected =
    filteredSubscriptions.length > 0 &&
    filteredSubscriptions.every((sub) => selectedToRemove.has(sub.userId));

  const toggleSubscribed = (userId: string) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleAllSubscribed = () => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredSubscriptions.forEach((sub) => next.delete(sub.userId));
      } else {
        filteredSubscriptions.forEach((sub) => next.add(sub.userId));
      }
      return next;
    });
  };

  const handleBulkUnsubscribe = async () => {
    if (selectedToRemove.size === 0) return;

    try {
      setBulkRemoving(true);
      const result = await subscriptionService.unsubscribeInBulk(subEventId, [...selectedToRemove]);
      await loadSubscriptions();
      setSelectedToRemove(new Set());

      const partes = [`${result.subscribed} inscrição(ões) removida(s)`];
      if (result.alreadySubscribed > 0) partes.push(`${result.alreadySubscribed} já não estava(m) inscrito(s)`);
      onSuccessRef.current?.(partes.join(' · '));
    } catch (err: any) {
      onErrorRef.current?.(err.response?.data?.message || 'Erro ao remover inscrições');
    } finally {
      setBulkRemoving(false);
    }
  };

  const subscribedUserIds = useMemo(
    () => new Set(subscriptions.map((s) => s.userId)),
    [subscriptions]
  );

  // Refs para callbacks estáveis — evita re-render infinito causado por arrow functions inline
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  const loadSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const data = await subscriptionService.listBySubEvent(subEventId);
      setSubscriptions(data);
    } catch (err: any) {
      onErrorRef.current?.(err.response?.data?.message || 'Erro ao carregar inscrições');
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  useEffect(() => {
    if (isOpen && subEventId) {
      loadSubscriptions();
      setSubscribedSearch('');
      setSelectedToRemove(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subEventId]);

  const handleBulkSubscribe = async (userIds: string[]) => {
    try {
      setBulkSubmitting(true);
      const result = await subscriptionService.subscribeInBulk(subEventId, userIds);
      await loadSubscriptions();

      const partes = [`${result.subscribed} aluno(s) inscrito(s)`];
      if (result.alreadySubscribed > 0) partes.push(`${result.alreadySubscribed} já estava(m) inscrito(s)`);
      if (result.notFound > 0) partes.push(`${result.notFound} não encontrado(s)`);
      onSuccessRef.current?.(partes.join(' · '));
    } catch (err: any) {
      onErrorRef.current?.(err.response?.data?.message || 'Erro ao inscrever alunos');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleUnsubscribe = async (userId: string) => {
    try {
      setRemovingId(userId);
      await subscriptionService.unsubscribe(subEventId, userId);
      setSubscriptions(prev => prev.filter(s => s.userId !== userId));
      onSuccessRef.current?.('Inscrição removida com sucesso!');
    } catch (err: any) {
      onErrorRef.current?.(err.response?.data?.message || 'Erro ao remover inscrição');
    } finally {
      setRemovingId(null);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inscrições</h2>
            <p className="text-sm text-gray-600 mt-1">{subEventTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Inscrição em massa */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Inscrever alunos</h3>
            <BulkStudentPicker
              subscribedUserIds={subscribedUserIds}
              isSubmitting={bulkSubmitting}
              onSubscribe={handleBulkSubscribe}
              onError={(message) => onErrorRef.current?.(message)}
            />
          </div>

          {/* Lista de inscritos */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                Inscritos
                <span className="text-xs font-normal bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                  {subscriptions.length}
                </span>
              </h3>

              <input
                type="text"
                placeholder="Filtrar inscritos..."
                value={subscribedSearch}
                onChange={(e) => setSubscribedSearch(e.target.value)}
                className="w-40 sm:w-52 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
              />
            </div>

            {loadingSubscriptions ? (
              <div className="text-sm text-gray-500 py-8 text-center">Carregando...</div>
            ) : subscriptions.length === 0 ? (
              <div className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-300 rounded-lg bg-white">
                Nenhum aluno inscrito ainda.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Barra de seleção */}
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllSubscribed}
                      disabled={filteredSubscriptions.length === 0 || bulkRemoving}
                      className="w-4 h-4 accent-[#B7294A]"
                    />
                    Selecionar todos ({filteredSubscriptions.length})
                  </label>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    {selectedToRemove.size} selecionado{selectedToRemove.size !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg bg-white max-h-72 overflow-y-auto">
                  {filteredSubscriptions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      Nenhum inscrito com esse filtro.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {filteredSubscriptions.map(sub => (
                        <li key={sub.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedToRemove.has(sub.userId)}
                            onChange={() => toggleSubscribed(sub.userId)}
                            disabled={bulkRemoving}
                            className="w-4 h-4 accent-[#B7294A] flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 truncate">{sub.userName}</p>
                            <p className="text-xs text-gray-500 truncate">{sub.userEmail || '—'}</p>
                          </div>
                          <button
                            onClick={() => handleUnsubscribe(sub.userId)}
                            disabled={removingId === sub.userId || bulkRemoving}
                            className="px-3 py-1 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                          >
                            {removingId === sub.userId ? '...' : 'Remover'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  onClick={handleBulkUnsubscribe}
                  disabled={selectedToRemove.size === 0 || bulkRemoving}
                  className="w-full px-4 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkRemoving
                    ? 'Removendo...'
                    : `Remover ${selectedToRemove.size > 0 ? selectedToRemove.size : ''} inscrição${selectedToRemove.size !== 1 ? 'ões' : ''}`}
                </button>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 px-8 py-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
