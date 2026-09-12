import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventService } from "@/services";
import { EventRequest, EventResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/common/Button";
import EventSubscriptionManager from '@/components/common/EventSubscriptionManager';
import DeleteEventModal from "@/components/common/DeleteEventModal";
import EventForm from "@/components/common/EventForm";
import PageLoader from "@/components/common/PageLoader";
import Toast from "@/components/common/Toast";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Layers,
  Image as ImageIcon,
  UserPlus,
  ChevronRight,
} from "lucide-react";

/** Seções da listagem. O corte é por data de término, não por status. */
type Secao = "proximos" | "passados" | "todos";

/**
 * Um evento é "próximo" enquanto não terminou — mesmo critério da consulta de
 * próximos eventos no servidor (endDate > agora). Assim a home e esta tela
 * nunca discordam sobre onde um evento aparece.
 */
const jaEncerrou = (event: EventResponse, agora: number) =>
  new Date(event.endDate).getTime() <= agora;

const porInicioCrescente = (a: EventResponse, b: EventResponse) =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

const Event: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [secao, setSecao] = useState<Secao>("proximos");

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventTitle: string;
  }>({ isOpen: false, eventId: null, eventTitle: "" });

  const [subscriptionModal, setSubscriptionModal] = useState<{
    isOpen: boolean;
    event: EventResponse | null;
  }>({ isOpen: false, event: null });

  const [isDeleting, setIsDeleting] = useState(false);

  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    event: EventResponse | null;
  }>({ isOpen: false, event: null });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ isVisible: false, message: "", type: "success" });

  const showToast = (
    message: string,
    type: "success" | "error" | "warning",
  ) => {
    setToast({ isVisible: true, message, type });
  };

  const hideToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // O servidor já recorta por papel: o aluno recebe apenas os eventos em
      // que tem inscrição em alguma atividade.
      const data = await eventService.getAllEvents();
      setEvents(data);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Não foi possível carregar eventos.";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line
  }, []);

  // "Agora" é fixado no carregamento: recalcular a cada render faria um evento
  // trocar de aba no meio de uma interação.
  const agora = useMemo(() => Date.now(), [events]);

  const { proximos, passados } = useMemo(() => {
    const busca = searchTerm.trim().toLowerCase();
    const encontrados = busca
      ? events.filter(
          (event) =>
            event.title.toLowerCase().includes(busca) ||
            (event.description &&
              event.description.toLowerCase().includes(busca)),
        )
      : events;

    return {
      proximos: encontrados
        .filter((event) => !jaEncerrou(event, agora))
        .sort(porInicioCrescente),
      // Histórico começa pelo mais recente.
      passados: encontrados
        .filter((event) => jaEncerrou(event, agora))
        .sort((a, b) => porInicioCrescente(b, a)),
    };
  }, [events, searchTerm, agora]);

  // Em "todos", o que está por vir vem primeiro e o histórico desce depois.
  const visiveis =
    secao === "proximos"
      ? proximos
      : secao === "passados"
        ? passados
        : [...proximos, ...passados];

  const abas: { id: Secao; label: string; total: number }[] = [
    { id: "proximos", label: "Próximos eventos", total: proximos.length },
    { id: "passados", label: "Eventos passados", total: passados.length },
    {
      id: "todos",
      label: "Todos os eventos",
      total: proximos.length + passados.length,
    },
  ];

  const handleOpenDeleteModal = (event: EventResponse) => {
    setDeleteModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
    });
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting)
      setDeleteModal({ isOpen: false, eventId: null, eventTitle: "" });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.eventId) return;
    try {
      setIsDeleting(true);
      await eventService.deleteEvent(deleteModal.eventId);
      setEvents((prev) => prev.filter((e) => e.id !== deleteModal.eventId));
      showToast("Evento excluído com sucesso!", "success");
      handleCloseDeleteModal();
    } catch (err: any) {
      showToast("Erro ao excluir evento.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreateModal = () =>
    setFormModal({ isOpen: true, event: null });
  const handleOpenEditModal = (event: EventResponse) =>
    setFormModal({ isOpen: true, event });
  const handleCloseFormModal = () => {
    if (!isSubmitting) setFormModal({ isOpen: false, event: null });
  };

  const handleFormSubmit = async (data: EventRequest) => {
    try {
      setIsSubmitting(true);
      if (formModal.event) {
        const updated = await eventService.updateEvent(
          formModal.event.id,
          data,
        );
        setEvents((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e)),
        );
        showToast("Evento atualizado!", "success");
      } else {
        const created = await eventService.createEvent(data);
        setEvents((prev) => [...prev, created]);
        showToast("Evento criado!", "success");
      }
      handleCloseFormModal();
    } catch (err: any) {
      showToast("Erro ao salvar evento.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const mensagemVazio = () => {
    if (searchTerm.trim()) {
      return {
        titulo: "Nenhum evento encontrado",
        texto: "Tente mudar o termo de busca.",
      };
    }
    if (secao === "passados") {
      return {
        titulo: "Nenhum evento encerrado",
        texto: isAdmin
          ? "Eventos já finalizados aparecem aqui."
          : "Os eventos que você participou aparecem aqui depois de encerrados.",
      };
    }
    if (secao === "proximos") {
      return {
        titulo: "Nenhum evento próximo",
        texto: isAdmin
          ? "Crie um novo evento para começar."
          : "Assim que a coordenação inscrever você em uma atividade, ela aparece aqui.",
      };
    }
    return {
      titulo: "Nenhum evento",
      texto: isAdmin
        ? "Crie um novo evento para começar."
        : "Você ainda não está inscrito em nenhum evento.",
    };
  };

  if (loading) {
    return <PageLoader message="Carregando eventos..." />;
  }

  const vazio = mensagemVazio();

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isAdmin ? "Gerenciar Eventos" : "Meus Eventos"}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            {isAdmin
              ? "Visualize e controle seus eventos"
              : "Eventos em que você está inscrito"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group flex-1 sm:flex-none">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#B7294A] transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full sm:w-64 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B7294A]/20 focus:border-[#B7294A] transition-all"
            />
          </div>
          {isAdmin && (
            <Button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 !py-2.5 px-6 shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={20} /> Novo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Seções. Os três recortes saem da mesma lista já carregada, então
          trocar de aba não refaz a chamada. */}
      <div
        role="tablist"
        aria-label="Seções de eventos"
        className="flex gap-1 mb-5 sm:mb-6 p-1 bg-gray-100 rounded-xl overflow-x-auto"
      >
        {abas.map((aba) => {
          const ativa = secao === aba.id;
          return (
            <button
              key={aba.id}
              role="tab"
              type="button"
              aria-selected={ativa}
              onClick={() => setSecao(aba.id)}
              className={`flex-1 min-w-fit whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                ativa
                  ? "bg-white text-[#B7294A] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {aba.label}
              <span
                className={`ml-2 text-xs font-bold ${ativa ? "text-[#B7294A]/70" : "text-gray-400"}`}
              >
                {aba.total}
              </span>
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">{vazio.titulo}</h3>
          <p className="text-gray-500 mt-1">{vazio.texto}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {visiveis.map((event) => {
            const encerrado = jaEncerrou(event, agora);
            return (
              <div
                key={event.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#B7294A]/10 transition-all duration-300 flex flex-col overflow-hidden"
              >
                <div
                  className={`relative h-40 sm:h-48 bg-gray-100 overflow-hidden group-hover:opacity-95 transition-opacity ${
                    encerrado ? "grayscale-[60%]" : ""
                  }`}
                >
                  {event.imageBase64 ? (
                    <img
                      src={event.imageBase64}
                      alt={event.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <ImageIcon size={40} className="opacity-20" />
                      <span className="text-xs mt-2 opacity-40">
                        Sem imagem
                      </span>
                    </div>
                  )}
                  {encerrado && (
                    <span className="absolute top-3 left-3 bg-gray-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                      Encerrado
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3
                      className="font-bold text-lg text-gray-900 leading-tight mb-2 group-hover:text-[#B7294A] transition-colors line-clamp-1"
                      title={event.title}
                    >
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                      {event.description || "Sem descrição disponível."}
                    </p>
                  </div>

                  <div className="mt-auto space-y-3 pt-2">
                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-[#B7294A]">
                        <Calendar size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Data
                        </span>
                        <span className="font-medium text-gray-900 leading-tight">
                          {formatDate(event.startDate)}
                        </span>
                      </div>
                    </div>

                    {event.latitude && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                          <MapPin size={16} />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Local
                          </span>
                          <span className="font-medium text-gray-900 leading-tight truncate w-full">
                            Ver no mapa
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin ? (
                  <div className="px-5 py-4 bg-gray-50/30 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => navigate(`/events/${event.id}/subevents`)}
                      className="flex-1 min-w-[6rem] flex items-center justify-center gap-2 px-3 py-2 bg-[#B7294A]/10 text-[#B7294A] hover:bg-[#B7294A] hover:text-white rounded-lg transition-all text-sm font-semibold shadow-sm hover:shadow-md"
                    >
                      <Layers size={16} />
                      Subeventos
                    </button>

                    <button
                      onClick={() =>
                        setSubscriptionModal({ isOpen: true, event })
                      }
                      className="flex-1 min-w-[6rem] flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white rounded-lg transition-all text-sm font-semibold shadow-sm hover:shadow-md"
                      title="Inscrever alunos em todas as atividades deste evento"
                    >
                      <UserPlus size={16} />
                      Inscrever
                    </button>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleOpenEditModal(event)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Editar Evento"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(event)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Excluir Evento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="px-5 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-[#B7294A] hover:bg-[#B7294A]/5 transition-colors"
                  >
                    Ver programação
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <>
          {/* Inscrever alunos em todas as atividades do evento */}
          <EventSubscriptionManager
            isOpen={subscriptionModal.isOpen}
            eventId={subscriptionModal.event?.id ?? ''}
            eventTitle={subscriptionModal.event?.title ?? ''}
            onClose={() => setSubscriptionModal({ isOpen: false, event: null })}
            onSuccess={(message) => showToast(message, 'success')}
            onError={(message) => showToast(message, 'error')}
          />

          <DeleteEventModal
            isOpen={deleteModal.isOpen}
            eventTitle={deleteModal.eventTitle}
            onConfirm={handleConfirmDelete}
            onCancel={handleCloseDeleteModal}
            isDeleting={isDeleting}
          />

          <EventForm
            isOpen={formModal.isOpen}
            event={formModal.event}
            onClose={handleCloseFormModal}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        </>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default Event;
