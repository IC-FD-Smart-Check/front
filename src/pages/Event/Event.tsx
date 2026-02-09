import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventService } from "@/services";
import { EventRequest, EventResponse } from "@/types";
import Button from "@/components/common/Button";
import DeleteEventModal from "@/components/common/DeleteEventModal";
import EventForm from "@/components/common/EventForm";
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
} from "lucide-react";

const Event: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventTitle: string;
  }>({ isOpen: false, eventId: null, eventTitle: "" });

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
      const data = await eventService.getAllEvents();
      setEvents(data);
      setFilteredEvents(data);
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

  useEffect(() => {
    let result = [...events];
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(search) ||
          (event.description &&
            event.description.toLowerCase().includes(search)),
      );
    }
    setFilteredEvents(result);
  }, [events, searchTerm]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B7294A]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciar Eventos
          </h1>
          <p className="text-gray-500 mt-1">
            Visualize e controle seus eventos ativos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group">
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
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 py-2.5 px-6 shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={20} /> Novo Evento
          </Button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum evento encontrado
          </h3>
          <p className="text-gray-500 mt-1">
            Tente mudar o termo de busca ou crie um novo evento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#B7294A]/10 transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className="relative h-48 bg-gray-100 overflow-hidden group-hover:opacity-95 transition-opacity">
                {event.imageBase64 ? (
                  <img
                    src={event.imageBase64}
                    alt={event.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <ImageIcon size={40} className="opacity-20" />
                    <span className="text-xs mt-2 opacity-40">Sem imagem</span>
                  </div>
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

              <div className="px-5 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => navigate(`/events/${event.id}/subevents`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 hover:text-purple-800 rounded-lg transition-all text-sm font-semibold shadow-sm hover:shadow-md"
                >
                  <Layers size={16} />
                  Subeventos
                </button>

                <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
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
            </div>
          ))}
        </div>
      )}

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
