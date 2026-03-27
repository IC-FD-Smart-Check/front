import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { eventService } from '@/services/eventService';
import { subEventService } from '@/services/subEventService';
import { checkService } from '@/services/checkService';
import { userService } from '@/services/userService';
import { reportService } from '@/services/reportService';
import { subscriptionService } from '@/services/subscriptionService';
import { EventResponse, SubEventResponse } from '@/types';
import { Users, CheckCircle, XCircle, FileText, Sheet, ArrowLeft, Loader2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  checkinTime?: string;
  checkoutTime?: string;
}

interface SubEventStats {
  inscritos: number;
  presentes: number;
  ausentes: number;
}

export default function Reports() {
  const { showToast } = useToast();

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [subeventos, setSubeventos] = useState<SubEventResponse[]>([]);
  const [selectedSubeventoId, setSelectedSubeventoId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [subEventStatsMap, setSubEventStatsMap] = useState<Map<string, SubEventStats>>(new Map());

  const [loading, setLoading] = useState(false);
  const [loadingSubeventos, setLoadingSubeventos] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [subEventInscritos, setSubEventInscritos] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedSubeventoId) {
      subscriptionService.listBySubEvent(selectedSubeventoId)
        .then(subs => setSubEventInscritos(subs.length))
        .catch(error => {
          console.error('Erro ao buscar inscritos:', error);
          showToast('Erro ao carregar inscritos do subevento', 'error');
          setSubEventInscritos(0);
        });
    }
  }, [selectedSubeventoId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.getAllEvents();
      setEvents(data);
    } catch (error) {
      showToast('Erro ao carregar eventos', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEventId) {
      setSubeventos([]);
      setSelectedSubeventoId('');
      setStudents([]);
      setSubEventStatsMap(new Map());
      return;
    }

    loadSubeventos();
  }, [selectedEventId]);

  const loadSubeventos = async () => {
    try {
      setLoadingSubeventos(true);
      setSubeventos([]);
      setSelectedSubeventoId('');
      setStudents([]);

      const data = await subEventService.getSubEventsByEventId(selectedEventId);
      setSubeventos(data);

      const statsMap = new Map<string, SubEventStats>();
      const allChecks = await checkService.getEventChecks(selectedEventId);
      const records = Array.isArray(allChecks) ? allChecks : (allChecks?.records ?? []);

      for (const subEvent of data) {
        const subEventChecks = records.filter(check => check.subEventId === subEvent.id);
        const presentes = subEventChecks.filter(c => c.checkinTime && c.checkoutTime).length;
        const ausentes = subEventChecks.filter(
          c => (c.checkinTime && !c.checkoutTime) || (!c.checkinTime && c.checkoutTime)
        ).length;

        try {
          const subscriptions = await subscriptionService.listBySubEvent(subEvent.id);
          const inscritos = subscriptions.length;

          statsMap.set(subEvent.id, {
            inscritos,
            presentes,
            ausentes,
          });
        } catch (error) {
          console.error(`Erro ao buscar inscritos do subevento ${subEvent.id}:`, error);
          showToast('Erro ao carregar estatísticas de inscrições', 'error');
          statsMap.set(subEvent.id, {
            inscritos: 0,
            presentes,
            ausentes,
          });
        }
      }

      setSubEventStatsMap(statsMap);

      if (data.length === 0) {
        showToast('Nenhum subevento encontrado para este evento', 'warning');
      }
    } catch (error) {
      showToast('Erro ao carregar subeventos', 'error');
      console.error(error);
    } finally {
      setLoadingSubeventos(false);
    }
  };

  useEffect(() => {
    if (selectedSubeventoId) {
      loadStudents();
    } else {
      setStudents([]);
    }
  }, [selectedSubeventoId]);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      setStudents([]);

      const data = await checkService.getEventChecks(selectedEventId);

      const allUsers = await userService.getAllUsers();
      const userEmailMap = new Map<string, string>();
      allUsers.forEach(user => {
        userEmailMap.set(user.id, user.email);
      });

      const records = Array.isArray(data) ? data : data?.records ?? [];

      const filteredRecords = records.filter(
        check => check.subEventId === selectedSubeventoId
      );

      const userMap = new Map<string, Student>();

      filteredRecords.forEach(check => {
        const existing = userMap.get(check.userId);

        const checkinTime = check.checkinTime
          ? new Date(check.checkinTime).toLocaleString('pt-BR')
          : undefined;

        const checkoutTime = check.checkoutTime
          ? new Date(check.checkoutTime).toLocaleString('pt-BR')
          : undefined;

        if (!existing) {
          userMap.set(check.userId, {
            id: check.userId,
            name: check.userName,
            email: userEmailMap.get(check.userId) || 'N/A',
            checkinTime,
            checkoutTime,
          });
        } else {
          if (checkinTime && !existing.checkinTime) {
            existing.checkinTime = checkinTime;
          }
          if (checkoutTime && !existing.checkoutTime) {
            existing.checkoutTime = checkoutTime;
          }
        }
      });

      const processed = Array.from(userMap.values());
      setStudents(processed);

      if (processed.length === 0) {
        showToast('Nenhum registro de presença encontrado', 'warning');
      }
    } catch (error) {
      showToast('Erro ao carregar dados de presença', 'error');
      console.error(error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const stats = {
    inscritos: subEventInscritos,
    presentes: students.filter(s => s.checkinTime && s.checkoutTime).length,
    ausentes: students.filter(
      s =>
        (s.checkinTime && !s.checkoutTime) ||
        (!s.checkinTime && s.checkoutTime)
    ).length,
  };

  const handleExportPDF = async () => {
    if (!selectedEventId) {
      showToast('Selecione um evento para exportar', 'error');
      return;
    }

    setExportingPdf(true);
    try {
      const response = selectedSubeventoId
        ? await reportService.exportSubEventPdf(selectedSubeventoId)
        : await reportService.exportEventPdf(selectedEventId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? (selectedSubeventoId ? 'relatorio_subevento.pdf' : 'relatorio_evento.pdf');

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('PDF exportado com sucesso', 'success');
    } catch (error) {
      showToast('Erro ao exportar PDF', 'error');
      console.error(error);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedEventId) {
      showToast('Selecione um evento para exportar', 'error');
      return;
    }

    setExportingExcel(true);
    try {
      const response = selectedSubeventoId
        ? await reportService.exportSubEventExcel(selectedSubeventoId)
        : await reportService.exportEventExcel(selectedEventId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? (selectedSubeventoId ? 'relatorio_subevento.xlsx' : 'relatorio_evento.xlsx');

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('Excel exportado com sucesso', 'success');
    } catch (error) {
      showToast('Erro ao exportar Excel', 'error');
      console.error(error);
    } finally {
      setExportingExcel(false);
    }
  };

  if (selectedSubeventoId) {
    const selectedSubevento = subeventos.find(s => s.id === selectedSubeventoId);

    return (
      <div className="p-4 sm:p-6">
        <div className="mb-5 sm:mb-6">
          <button
            onClick={() => setSelectedSubeventoId('')}
            className="flex items-center gap-2 text-[#B7294A] hover:text-[#8a1f39] mb-4 font-medium"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {selectedSubevento?.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Detalhes de presença e exportação
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total de Inscritos</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2">{stats.inscritos || '-'}</p>
              </div>
              <Users size={32} className="text-blue-500 opacity-20 sm:w-10 sm:h-10" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-green-600 font-medium">Presentes</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1 sm:mt-2">{stats.presentes}</p>
              </div>
              <CheckCircle size={32} className="text-green-500 opacity-20 sm:w-10 sm:h-10" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 sm:p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-red-600 font-medium">Ausentes</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-900 mt-1 sm:mt-2">{stats.ausentes}</p>
              </div>
              <XCircle size={32} className="text-red-500 opacity-20 sm:w-10 sm:h-10" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Lista de Presença</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {`${events.find(e => e.id === selectedEventId)?.title} / ${selectedSubevento?.title}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf}
                className="p-2 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar PDF"
                aria-label="Exportar relatório em PDF"
              >
                {exportingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="p-2 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar Excel"
                aria-label="Exportar relatório em Excel"
              >
                {exportingExcel ? <Loader2 size={20} className="animate-spin" /> : <Sheet size={20} />}
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check-in</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check-out</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingStudents ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Carregando dados de presença...
                    </td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{student.email}</td>
                      <td className="px-6 py-5 text-sm text-gray-700 whitespace-nowrap">
                        {student.checkinTime ? (
                          <span className="text-green-600 font-medium">
                            {student.checkinTime}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700 whitespace-nowrap">
                        {student.checkoutTime ? (
                          <span className="text-blue-600 font-medium">
                            {student.checkoutTime}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhum dado disponível
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {loadingStudents ? (
              <div className="px-4 py-6 text-center text-gray-500">
                Carregando dados de presença...
              </div>
            ) : students.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {students.map((student, index) => (
                  <div key={student.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{index + 1}. {student.name}</p>
                        <p className="text-xs text-gray-600 break-all">{student.email}</p>
                      </div>
                      {student.checkoutTime ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Apenas Check-in
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Check-in</p>
                        <p className="text-gray-800 font-medium">
                          {student.checkinTime ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Check-out</p>
                        <p className="text-gray-800 font-medium">
                          {student.checkoutTime ?? '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </div>

          {students.length > 0 && (
            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
              Exibindo {students.length} registro(s)
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedEventId && subeventos.length > 0) {
    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
      <div className="p-4 sm:p-6">
        <div className="mb-5 sm:mb-6">
          <button
            onClick={() => setSelectedEventId('')}
            className="flex items-center gap-2 text-[#B7294A] hover:text-[#8a1f39] mb-4 font-medium"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {selectedEvent?.title}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Selecione um subevento para visualizar detalhes
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                disabled={loading || exportingPdf}
                className="p-2 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar PDF Completo"
                aria-label="Exportar relatório completo em PDF"
              >
                {exportingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={loading || exportingExcel}
                className="p-2 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar Excel Completo"
                aria-label="Exportar relatório completo em Excel"
              >
                {exportingExcel ? <Loader2 size={20} className="animate-spin" /> : <Sheet size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subevento</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Inscritos</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Presentes</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Ausentes</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subeventos.map((subevento) => {
                  const subStats = subEventStatsMap.get(subevento.id) || { inscritos: 0, presentes: 0, ausentes: 0 };

                  return (
                    <tr key={subevento.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">{subevento.title}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {new Date(subevento.startDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-lg font-bold text-blue-900">{subStats.inscritos || '-'}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-lg font-bold text-green-900">{subStats.presentes}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-lg font-bold text-red-900">{subStats.ausentes}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => setSelectedSubeventoId(subevento.id)}
                          className="px-3 py-1 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-200">
            {subeventos.map((subevento) => {
              const subStats = subEventStatsMap.get(subevento.id) || { inscritos: 0, presentes: 0, ausentes: 0 };

              return (
                <div key={subevento.id} className="px-4 py-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{subevento.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(subevento.startDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Inscritos</p>
                      <p className="text-lg font-bold text-blue-900">{subStats.inscritos || '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Presentes</p>
                      <p className="text-lg font-bold text-green-900">{subStats.presentes}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Ausentes</p>
                      <p className="text-lg font-bold text-red-900">{subStats.ausentes}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSubeventoId(subevento.id)}
                    className="w-full px-3 py-1 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                  >
                    Ver detalhes
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Relatórios de Presença
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gerencie e exporte relatórios de presença dos eventos
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar Evento
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              if (e.target.value) {
                const eventName = events.find(ev => ev.id === e.target.value)?.title;
                showToast(`Evento "${eventName}" selecionado`, 'success');
              }
            }}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{loading ? 'Carregando eventos...' : 'Escolha um evento'}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.startDate).toLocaleDateString('pt-BR')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedEventId && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione um evento</h3>
          <p className="text-gray-600">Escolha um evento no seletor acima para começar</p>
        </div>
      )}

      {selectedEventId && loadingSubeventos && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Carregando subeventos...</h3>
          <p className="text-gray-600">Aguarde enquanto os subeventos são carregados</p>
        </div>
      )}

      {selectedEventId && subeventos.length === 0 && !loadingSubeventos && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum subevento encontrado</h3>
          <p className="text-gray-600">Crie um subevento para visualizar relatórios de presença</p>
        </div>
      )}
    </div>
  );
}
