import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/useToast';
import { eventService } from '@/services/eventService';
import { subEventService } from '@/services/subEventService';
import { checkService } from '@/services/checkService';
import { userService } from '@/services/userService';
import { reportService } from '@/services/reportService';
import { subscriptionService } from '@/services/subscriptionService';
import type { EventResponse, SubEventResponse } from '@/types';
import PageLoader from '@/components/common/PageLoader';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileText,
  Sheet,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  ra: string;
  classGroupName: string;
  courseName: string;
  /** ISO vindo da API; a formatação acontece só na hora de exibir */
  checkinTime?: string;
  checkoutTime?: string;
}

interface SubEventStats {
  inscritos: number;
  presentes: number;
  ausentes: number;
}

type Presence = 'PRESENTE' | 'INCOMPLETO' | 'AUSENTE';

/**
 * Mesma regra do relatório exportado (AttendanceReportService no backend):
 * presente exige check-in E check-out; só um dos dois é incompleto;
 * quem não tem registro nenhum é ausente.
 */
const presenceOf = (student: Student): Presence => {
  if (student.checkinTime && student.checkoutTime) return 'PRESENTE';
  if (student.checkinTime || student.checkoutTime) return 'INCOMPLETO';
  return 'AUSENTE';
};

// Sem segundos: a coluna fica bem mais estreita e o relatório não perde nada
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const emptyFilters = {
  name: '',
  email: '',
  ra: '',
  classGroup: 'ALL',
  course: 'ALL',
  checkin: 'ALL',
  checkout: 'ALL',
  presence: 'ALL',
};

type Filters = typeof emptyFilters;

const filterInputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent';

const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block min-w-0">
    <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
    {children}
  </label>
);

const presenceStyles: Record<Presence, { label: string; className: string }> = {
  PRESENTE: { label: 'Presente', className: 'bg-green-100 text-green-800' },
  INCOMPLETO: { label: 'Incompleto', className: 'bg-yellow-100 text-yellow-800' },
  AUSENTE: { label: 'Ausente', className: 'bg-red-100 text-red-800' },
};

const PresenceBadge: React.FC<{ presence: Presence }> = ({ presence }) => {
  const { label, className } = presenceStyles[presence];
  return (
    <span
      className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
};

const tileStyles = {
  blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700 [&_p:last-child]:text-blue-900',
  green: 'from-green-50 to-green-100 border-green-200 text-green-700 [&_p:last-child]:text-green-900',
  amber: 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-700 [&_p:last-child]:text-yellow-900',
  red: 'from-red-50 to-red-100 border-red-200 text-red-700 [&_p:last-child]:text-red-900',
};

const StatTile: React.FC<{
  label: string;
  value: number | string;
  tone: keyof typeof tileStyles;
  icon: LucideIcon;
}> = ({ label, value, tone, icon: Icon }) => (
  <div className={`bg-gradient-to-br rounded-xl p-3 sm:p-5 border min-w-0 ${tileStyles[tone]}`}>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="min-w-0 order-2 sm:order-1">
        <p className="text-[11px] leading-tight sm:text-sm font-medium">{label}</p>
        <p className="text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{value}</p>
      </div>
      <Icon size={20} className="opacity-60 sm:opacity-25 sm:w-9 sm:h-9 order-1 sm:order-2" />
    </div>
  </div>
);

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

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

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
      const records = await checkService.getEventChecks(selectedEventId);

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
    setFilters(emptyFilters);

    if (selectedSubeventoId) {
      loadStudents();
    } else {
      setStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubeventoId]);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      setStudents([]);

      const [records, allUsers, subscriptions] = await Promise.all([
        checkService.getEventChecks(selectedEventId),
        userService.getAllUsers(),
        subscriptionService.listBySubEvent(selectedSubeventoId),
      ]);

      setSubEventInscritos(subscriptions.length);

      const usersById = new Map(allUsers.map((user) => [user.id, user]));
      const rows = new Map<string, Student>();

      // O cadastro do usuário é a fonte de RA, turma e curso; o check só traz o nome
      const ensureRow = (userId: string, fallbackName: string): Student => {
        const existing = rows.get(userId);
        if (existing) return existing;

        const user = usersById.get(userId);
        const student: Student = {
          id: userId,
          name: user?.name || fallbackName || 'Sem nome',
          email: user?.email || '',
          ra: user?.ra || '',
          classGroupName: user?.classGroupName || '',
          courseName: user?.courseName || '',
        };
        rows.set(userId, student);
        return student;
      };

      // Começa pelos inscritos: quem não apareceu precisa constar como ausente
      subscriptions.forEach((subscription) => ensureRow(subscription.userId, subscription.userName));

      records
        .filter((check) => check.subEventId === selectedSubeventoId)
        .forEach((check) => {
          const student = ensureRow(check.userId, check.userName);
          if (check.checkinTime && !student.checkinTime) student.checkinTime = check.checkinTime;
          if (check.checkoutTime && !student.checkoutTime) student.checkoutTime = check.checkoutTime;
        });

      const processed = [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setStudents(processed);

      if (processed.length === 0) {
        showToast('Nenhum inscrito ou registro de presença encontrado', 'warning');
      }
    } catch (error) {
      showToast('Erro ao carregar dados de presença', 'error');
      console.error(error);
      setSubEventInscritos(0);
    } finally {
      setLoadingStudents(false);
    }
  };

  const stats = {
    inscritos: subEventInscritos,
    presentes: students.filter((student) => presenceOf(student) === 'PRESENTE').length,
    incompletos: students.filter((student) => presenceOf(student) === 'INCOMPLETO').length,
    ausentes: students.filter((student) => presenceOf(student) === 'AUSENTE').length,
  };

  // Opções de turma e curso saem dos próprios alunos da lista
  const classGroupOptions = useMemo(
    () =>
      [...new Set(students.map((student) => student.classGroupName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [students]
  );

  const courseOptions = useMemo(
    () =>
      [...new Set(students.map((student) => student.courseName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const matchesText = (value: string, term: string) =>
      !term || value.toLowerCase().includes(term.trim().toLowerCase());

    const matchesHas = (has: boolean, mode: string) =>
      mode === 'ALL' || (mode === 'COM' ? has : !has);

    return students.filter((student) => {
      if (!matchesText(student.name, filters.name)) return false;
      if (!matchesText(student.email, filters.email)) return false;
      if (!matchesText(student.ra, filters.ra)) return false;
      if (filters.classGroup !== 'ALL' && student.classGroupName !== filters.classGroup) return false;
      if (filters.course !== 'ALL' && student.courseName !== filters.course) return false;
      if (!matchesHas(!!student.checkinTime, filters.checkin)) return false;
      if (!matchesHas(!!student.checkoutTime, filters.checkout)) return false;
      if (filters.presence !== 'ALL' && presenceOf(student) !== filters.presence) return false;
      return true;
    });
  }, [students, filters]);

  const activeFilterCount = Object.entries(filters).filter(
    ([, value]) => value !== '' && value !== 'ALL'
  ).length;
  const hasActiveFilters = activeFilterCount > 0;

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(emptyFilters);

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

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const selectedSubevento = subeventos.find((sub) => sub.id === selectedSubeventoId);

  // O botão de exportar usa a seleção atual: subevento específico ou evento inteiro
  const exportScope = selectedSubevento
    ? `do subevento "${selectedSubevento.title}"`
    : selectedEvent
    ? `do evento "${selectedEvent.title}" (todos os subeventos)`
    : '';

  const selectClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
          Relatórios de Presença
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Escolha o evento e, se quiser, um subevento específico para ver a presença e exportar.
        </p>
      </div>

      {/* Seletores — permanecem visíveis o tempo todo, junto com os resultados */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="report-event" className="block text-sm font-medium text-gray-700 mb-1.5">
              Evento
            </label>
            <select
              id="report-event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={loading}
              className={selectClass}
            >
              <option value="">{loading ? 'Carregando eventos...' : 'Escolha um evento'}</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} — {new Date(event.startDate).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-subevent"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Subevento
            </label>
            <select
              id="report-subevent"
              value={selectedSubeventoId}
              onChange={(e) => setSelectedSubeventoId(e.target.value)}
              disabled={!selectedEventId || loadingSubeventos || subeventos.length === 0}
              className={selectClass}
            >
              <option value="">
                {!selectedEventId
                  ? 'Escolha um evento primeiro'
                  : loadingSubeventos
                  ? 'Carregando subeventos...'
                  : subeventos.length === 0
                  ? 'Nenhum subevento cadastrado'
                  : 'Todos os subeventos (visão geral)'}
              </option>
              {subeventos.map((subevento) => (
                <option key={subevento.id} value={subevento.id}>
                  {subevento.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Exportação — sempre acessível assim que há um evento escolhido */}
        {selectedEventId && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 flex-1 min-w-0">
              Exportar a presença <span className="font-medium text-gray-900">{exportScope}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingPdf ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingExcel ? <Loader2 size={18} className="animate-spin" /> : <Sheet size={18} />}
                Excel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resultados */}
      {!selectedEventId ? (
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione um evento</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Escolha um evento no seletor acima para ver a presença.
          </p>
        </div>
      ) : loadingSubeventos ? (
        <div className="bg-white rounded-lg shadow-sm">
          <PageLoader message="Carregando subeventos..." />
        </div>
      ) : subeventos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum subevento encontrado</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Cadastre um subevento neste evento para gerar relatórios de presença.
          </p>
        </div>
      ) : selectedSubeventoId ? (
        /* ----- Detalhe de um subevento ----- */        <div className="space-y-4 sm:space-y-6">
          {/* Totais do subevento */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatTile label="Inscritos" value={stats.inscritos} tone="blue" icon={Users} />
            <StatTile label="Presentes" value={stats.presentes} tone="green" icon={CheckCircle} />
            <StatTile label="Incompletos" value={stats.incompletos} tone="amber" icon={Clock} />
            <StatTile label="Ausentes" value={stats.ausentes} tone="red" icon={XCircle} />
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Lista de Presença
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                    {selectedSubevento?.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    hasActiveFilters
                      ? 'border-[#B7294A] text-[#B7294A] bg-[#B7294A]/5'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Filter size={16} />
                  Filtros
                  {hasActiveFilters && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[#B7294A] text-white text-xs">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Um filtro por coluna */}
              {filtersOpen && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <FilterField label="Nome">
                      <input
                        type="text"
                        value={filters.name}
                        onChange={(e) => updateFilter('name', e.target.value)}
                        placeholder="Buscar nome..."
                        className={filterInputClass}
                      />
                    </FilterField>

                    <FilterField label="Email">
                      <input
                        type="text"
                        value={filters.email}
                        onChange={(e) => updateFilter('email', e.target.value)}
                        placeholder="Buscar email..."
                        className={filterInputClass}
                      />
                    </FilterField>

                    <FilterField label="RA">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={filters.ra}
                        onChange={(e) => updateFilter('ra', e.target.value)}
                        placeholder="Buscar RA..."
                        className={filterInputClass}
                      />
                    </FilterField>

                    <FilterField label="Turma">
                      <select
                        value={filters.classGroup}
                        onChange={(e) => updateFilter('classGroup', e.target.value)}
                        className={filterInputClass}
                      >
                        <option value="ALL">Todas</option>
                        {classGroupOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Curso">
                      <select
                        value={filters.course}
                        onChange={(e) => updateFilter('course', e.target.value)}
                        className={filterInputClass}
                      >
                        <option value="ALL">Todos</option>
                        {courseOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Check-in">
                      <select
                        value={filters.checkin}
                        onChange={(e) => updateFilter('checkin', e.target.value)}
                        className={filterInputClass}
                      >
                        <option value="ALL">Todos</option>
                        <option value="COM">Com check-in</option>
                        <option value="SEM">Sem check-in</option>
                      </select>
                    </FilterField>

                    <FilterField label="Check-out">
                      <select
                        value={filters.checkout}
                        onChange={(e) => updateFilter('checkout', e.target.value)}
                        className={filterInputClass}
                      >
                        <option value="ALL">Todos</option>
                        <option value="COM">Com check-out</option>
                        <option value="SEM">Sem check-out</option>
                      </select>
                    </FilterField>

                    <FilterField label="Presença">
                      <select
                        value={filters.presence}
                        onChange={(e) => updateFilter('presence', e.target.value)}
                        className={filterInputClass}
                      >
                        <option value="ALL">Todas</option>
                        <option value="PRESENTE">Presente</option>
                        <option value="INCOMPLETO">Incompleto</option>
                        <option value="AUSENTE">Ausente</option>
                      </select>
                    </FilterField>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex justify-end mt-3">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabela — tablet/desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      RA
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Turma
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Curso
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Check-out
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Presença
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={8}>
                        <PageLoader compact message="Carregando dados de presença..." />
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {student.email || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {student.ra || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {student.classGroupName || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {student.courseName || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap">
                          {student.checkinTime ? (
                            <span className="text-green-700 font-medium">
                              {formatDateTime(student.checkinTime)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap">
                          {student.checkoutTime ? (
                            <span className="text-blue-700 font-medium">
                              {formatDateTime(student.checkoutTime)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <PresenceBadge presence={presenceOf(student)} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {students.length === 0
                          ? 'Nenhum inscrito ou registro de presença'
                          : 'Nenhum aluno encontrado com os filtros aplicados'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards — celular */}
            <div className="md:hidden">
              {loadingStudents ? (
                <PageLoader compact message="Carregando dados de presença..." />
              ) : filteredStudents.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <div key={student.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 break-words">
                            {index + 1}. {student.name}
                          </p>
                          {student.email && (
                            <p className="text-xs text-gray-600 break-all">{student.email}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {student.ra ? `RA ${student.ra}` : 'sem RA'}
                          </p>
                        </div>
                        <PresenceBadge presence={presenceOf(student)} />
                      </div>

                      {(student.classGroupName || student.courseName) && (
                        <p className="mt-2 text-xs text-gray-600 break-words">
                          {student.classGroupName || '—'}
                          {student.courseName && (
                            <span className="text-gray-500"> · {student.courseName}</span>
                          )}
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="text-gray-500">Check-in</p>
                          <p className="text-gray-800 font-medium">
                            {student.checkinTime ? formatDateTime(student.checkinTime) : '—'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-500">Check-out</p>
                          <p className="text-gray-800 font-medium">
                            {student.checkoutTime ? formatDateTime(student.checkoutTime) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  {students.length === 0
                    ? 'Nenhum inscrito ou registro de presença'
                    : 'Nenhum aluno encontrado com os filtros aplicados'}
                </div>
              )}
            </div>

            {!loadingStudents && students.length > 0 && (
              <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                Exibindo {filteredStudents.length} de {students.length} aluno
                {students.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ----- Visão geral do evento ----- */
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Subeventos do evento
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {subeventos.length} subevento{subeventos.length !== 1 ? 's' : ''} · escolha um para
              ver a lista de presença
            </p>
          </div>

          {/* Tabela — tablet/desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Subevento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Inscritos
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Presentes
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ausentes
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subeventos.map((subevento) => {
                  const subStats = subEventStatsMap.get(subevento.id) || {
                    inscritos: 0,
                    presentes: 0,
                    ausentes: 0,
                  };

                  return (
                    <tr key={subevento.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {subevento.title}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {new Date(subevento.startDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-lg font-bold text-blue-900">
                          {subStats.inscritos || '-'}
                        </span>
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
                          className="px-3 py-1.5 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors text-sm font-medium"
                        >
                          Ver presença
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards — celular */}
          <div className="md:hidden divide-y divide-gray-200">
            {subeventos.map((subevento) => {
              const subStats = subEventStatsMap.get(subevento.id) || {
                inscritos: 0,
                presentes: 0,
                ausentes: 0,
              };

              return (
                <div key={subevento.id} className="px-4 py-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 leading-snug break-words">
                      {subevento.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(subevento.startDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-blue-50 border border-blue-200 rounded-lg py-2">
                      <p className="text-[11px] text-blue-700 mb-0.5">Inscritos</p>
                      <p className="text-lg font-bold text-blue-900">{subStats.inscritos || '-'}</p>
                    </div>
                    <div className="text-center bg-green-50 border border-green-200 rounded-lg py-2">
                      <p className="text-[11px] text-green-700 mb-0.5">Presentes</p>
                      <p className="text-lg font-bold text-green-900">{subStats.presentes}</p>
                    </div>
                    <div className="text-center bg-red-50 border border-red-200 rounded-lg py-2">
                      <p className="text-[11px] text-red-700 mb-0.5">Ausentes</p>
                      <p className="text-lg font-bold text-red-900">{subStats.ausentes}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSubeventoId(subevento.id)}
                    className="w-full px-3 py-2.5 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors text-sm font-medium"
                  >
                    Ver presença
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
