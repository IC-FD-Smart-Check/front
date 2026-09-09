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
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

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
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Inscritos
              <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {subscriptions.length}
              </span>
            </h3>

            {loadingSubscriptions ? (
              <div className="text-sm text-gray-500 py-6 text-center">Carregando...</div>
            ) : subscriptions.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                Nenhum usuário inscrito ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {subscriptions.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.userName}</p>
                      <p className="text-xs text-gray-500">{sub.userEmail || '—'}</p>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe(sub.userId)}
                      disabled={removingId === sub.userId}
                      className="px-4 py-1.5 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {removingId === sub.userId ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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
