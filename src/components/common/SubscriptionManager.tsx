import React, { useEffect, useRef, useState } from 'react';
import { SubscriptionResponse, UserResponse } from '@/types';
import { subscriptionService } from '@/services';
import Button from './Button';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResponse[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      setSearchQuery('');
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subEventId]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    try {
      setSearching(true);
      const results = await subscriptionService.searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (err: any) {
      onErrorRef.current?.(err.response?.data?.message || 'Erro ao buscar usuários');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSubscribe = async (userId: string) => {
    try {
      setSubscribingId(userId);
      await subscriptionService.subscribe(subEventId, userId);
      await loadSubscriptions();
      onSuccessRef.current?.('Usuário inscrito com sucesso!');
    } catch (err: any) {
      onErrorRef.current?.(err.response?.data?.message || 'Erro ao inscrever usuário');
    } finally {
      setSubscribingId(null);
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

  const isAlreadySubscribed = (userId: string) =>
    subscriptions.some(s => s.userId === userId);

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

          {/* Busca de usuários */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Inscrever usuário</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar por nome ou email..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
              />
              <Button onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2}>
                {searching ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            {/* Resultados da busca */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map(user => {
                  const subscribed = isAlreadySubscribed(user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email || user.ra || '—'}</p>
                      </div>
                      {subscribed ? (
                        <span className="text-xs text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          Inscrito
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(user.id)}
                          disabled={subscribingId === user.id}
                          className="px-4 py-1.5 bg-[#B7294A] text-white rounded-lg hover:bg-[#9a2139] transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {subscribingId === user.id ? 'Inscrevendo...' : 'Inscrever'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.trim().length >= 2 && !searching && (
              <p className="mt-3 text-sm text-gray-500">Nenhum usuário encontrado.</p>
            )}
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
