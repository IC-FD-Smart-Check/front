import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck } from 'lucide-react';
import { subEventService, subscriptionService } from '@/services';
import type { SubEventResponse, SubscriptionResponse } from '@/types';
import BulkStudentPicker from './BulkStudentPicker';

interface EventSubscriptionManagerProps {
  isOpen: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * Inscreve alunos em TODAS as atividades de um evento de uma vez.
 * Para inscrever em uma atividade específica, use o modal de inscrições do subevento.
 */
const EventSubscriptionManager: React.FC<EventSubscriptionManagerProps> = ({
  isOpen,
  eventId,
  eventTitle,
  onClose,
  onSuccess,
  onError,
}) => {
  const [subEvents, setSubEvents] = useState<SubEventResponse[]>([]);
  const [subscribedUserIds, setSubscribedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // "Já inscrito no evento" = inscrito em TODAS as atividades, pois este fluxo
  // inscreve em todas de uma vez. Marcamos apenas quem já está em todas para não
  // bloquear alunos parcialmente inscritos (que ainda faltam em alguma atividade).
  const computeFullySubscribed = async (subs: SubEventResponse[]): Promise<Set<string>> => {
    if (subs.length === 0) return new Set();
    const perSubEvent = await Promise.all(
      subs.map((subEvent) =>
        subscriptionService.listBySubEvent(subEvent.id).catch(() => [] as SubscriptionResponse[])
      )
    );
    const idSets = perSubEvent.map((list) => new Set(list.map((sub) => sub.userId)));
    return idSets.reduce<Set<string>>(
      (acc, set, index) =>
        index === 0 ? new Set(set) : new Set([...acc].filter((id) => set.has(id))),
      new Set<string>()
    );
  };

  useEffect(() => {
    if (!isOpen || !eventId) return;

    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await subEventService.getSubEventsByEventId(eventId);
        if (!active) return;
        setSubEvents(data);
        const ids = await computeFullySubscribed(data);
        if (active) setSubscribedUserIds(ids);
      } catch (err: any) {
        if (active) onError?.(err.response?.data?.message || 'Erro ao carregar atividades do evento');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const handleSubscribe = async (userIds: string[]) => {
    try {
      setSubmitting(true);
      const result = await subscriptionService.subscribeToEvent(eventId, userIds);

      const partes = [
        `${result.subscribed} inscrição(ões) criada(s) em ${result.subEvents} atividade(s)`,
      ];
      if (result.alreadySubscribed > 0) partes.push(`${result.alreadySubscribed} já existia(m)`);
      if (result.notFound > 0) partes.push(`${result.notFound} aluno(s) não encontrado(s)`);

      onSuccess?.(partes.join(' · '));

      // Atualiza a marcação de "já inscrito" após as novas inscrições.
      const ids = await computeFullySubscribed(subEvents);
      setSubscribedUserIds(ids);
    } catch (err: any) {
      onError?.(err.response?.data?.message || 'Erro ao inscrever alunos no evento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[92dvh] flex flex-col">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b-2 border-gray-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
              <CalendarCheck size={20} className="text-[#B7294A]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900">Inscrever no evento</h2>
              <p className="text-sm text-gray-600 truncate">{eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-5">
          {/* Aviso do escopo da operação */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">
                Os alunos selecionados serão inscritos em TODAS as atividades deste evento.
              </p>
              {loading ? (
                <p>Carregando as atividades...</p>
              ) : subEvents.length === 0 ? (
                <p>Este evento ainda não tem nenhuma atividade cadastrada.</p>
              ) : (
                <>
                  <p className="mb-2">
                    São {subEvents.length} atividade{subEvents.length !== 1 ? 's' : ''}, e cada aluno
                    selecionado gera uma inscrição em cada uma:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {subEvents.map((subEvent) => (
                      <li key={subEvent.id}>{subEvent.title}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Para inscrever em uma atividade específica, use o botão de inscrições da própria
                    atividade.
                  </p>
                </>
              )}
            </div>
          </div>

          {subEvents.length > 0 && (
            <BulkStudentPicker
              subscribedUserIds={subscribedUserIds}
              isSubmitting={submitting}
              onSubscribe={handleSubscribe}
              onError={(message) => onError?.(message)}
              submitLabel="Inscrever em todas as atividades"
            />
          )}
        </div>

        <div className="px-4 sm:px-8 py-3 sm:py-4 border-t-2 border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventSubscriptionManager;
