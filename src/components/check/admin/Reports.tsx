import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/useToast';
import { eventService } from '@/services/eventService';
import { subEventService } from '@/services/subEventService';
import { checkService } from '@/services/checkService';
import { userService } from '@/services/userService';
import { reportService, type ReportTemplate } from '@/services/reportService';
import { subscriptionService } from '@/services/subscriptionService';
import type { EventResponse, SubEventResponse } from '@/types';
import PageLoader from '@/components/common/PageLoader';
import AttendanceDetailsModal, { type AttendanceDetailsSubject } from './AttendanceDetailsModal';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileText,
  Sheet,
  Loader2,
  Eye,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

/** Uma entrada do seletor de exportação, já com a ação que ela executa. */
interface OpcaoExportacao {
  id: string;
  nome: string;
  descricao: string;
  formato: 'PDF' | 'EXCEL' | 'ZIP';
  executar: () => Promise<void>;
}

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
  /** id do registro de check, necessário para abrir as fotos */
  checkId?: string;
  hasCheckinPhoto?: boolean;
  hasCheckoutPhoto?: boolean;
  /** Lançado na mão por um admin, em vez de escaneado pelo aluno. */
  checkinManual?: boolean;
  checkoutManual?: boolean;
  checkinIp?: string | null;
  checkoutIp?: string | null;
}

interface SubEventStats {
  inscritos: number;
  presentes: number;
  incompletos: number;
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
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detalhes, setDetalhes] = useState<AttendanceDetailsSubject | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [modeloId, setModeloId] = useState('');

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
        // Mesma regra da tela "Ver Presença" (presenceOf), para os números baterem
        //  - presente: tem check-in E check-out
        //  - incompleto: só um dos dois
        //  - ausente: inscrito sem NENHUM registro de check
        const presentes = subEventChecks.filter(c => c.checkinTime && c.checkoutTime).length;
        const incompletos = subEventChecks.filter(
          c => (c.checkinTime && !c.checkoutTime) || (!c.checkinTime && c.checkoutTime)
        ).length;
        // Check é único por (subevento, usuário), então cada registro é um inscrito distinto.
        const comRegistro = subEventChecks.length;

        try {
          const subscriptions = await subscriptionService.listBySubEvent(subEvent.id);
          const inscritos = subscriptions.length;
          const ausentes = Math.max(0, inscritos - comRegistro);

          statsMap.set(subEvent.id, {
            inscritos,
            presentes,
            incompletos,
            ausentes,
          });
        } catch (error) {
          console.error(`Erro ao buscar inscritos do subevento ${subEvent.id}:`, error);
          showToast('Erro ao carregar estatísticas de inscrições', 'error');
          statsMap.set(subEvent.id, {
            inscritos: 0,
            presentes,
            incompletos,
            ausentes: 0,
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
          student.checkId = check.id;
          student.hasCheckinPhoto = check.hasCheckinPhoto;
          student.hasCheckoutPhoto = check.hasCheckoutPhoto;
          student.checkinManual = check.checkinManual;
          student.checkoutManual = check.checkoutManual;
          student.checkinIp = check.checkinIp;
          student.checkoutIp = check.checkoutIp;
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

  // A lista de modelos vem do backend; registrar um novo lá o faz aparecer aqui.
  useEffect(() => {
    reportService
      .listTemplates()
      .then(setTemplates)
      .catch(() => {
        // Sem modelos extras a tela continua funcionando com PDF e Excel.
        setTemplates([]);
      });
  }, []);

  /** Baixa o blob com o nome que o servidor mandou no Content-Disposition. */
  const baixarBlob = (response: { data: BlobPart; headers: Record<string, unknown> }, fallback: string) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const disposition = response.headers['content-disposition'] as string | undefined;
    const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  /**
   * Modelos disponiveis para a selecao atual.
   *
   * Os modelos do registro trabalham por subevento. Sem subevento escolhido a
   * exportacao cobre o evento inteiro, e para isso existem so as duas listas
   * basicas, nos endpoints por evento.
   */
  const opcoesExportacao = useMemo<OpcaoExportacao[]>(() => {
    if (selectedSubeventoId) {
      return templates.map((template) => ({
        id: template.id,
        nome: template.name,
        descricao: template.description,
        formato: template.format,
        executar: async () => {
          const response = await reportService.exportSubEventByTemplate(
            selectedSubeventoId,
            template.id,
          );
          const ext =
            template.format === 'PDF' ? 'pdf' : template.format === 'ZIP' ? 'zip' : 'xlsx';
          baixarBlob(response, `${template.id}.${ext}`);
        },
      }));
    }

    if (!selectedEventId) return [];

    return [
      {
        id: 'evento-pdf',
        nome: 'Lista de presença (PDF)',
        descricao:
          'Uma lista com todos os inscritos de todos os subeventos do evento, com horários e situação de presença.',
        formato: 'PDF',
        executar: async () => {
          const response = await reportService.exportEventPdf(selectedEventId);
          baixarBlob(response, 'relatorio_evento.pdf');
        },
      },
      {
        id: 'evento-excel',
        nome: 'Lista de presença (Excel)',
        descricao:
          'Os mesmos dados da lista em PDF, em planilha, para filtrar e contar presenças do evento inteiro.',
        formato: 'EXCEL',
        executar: async () => {
          const response = await reportService.exportEventExcel(selectedEventId);
          baixarBlob(response, 'relatorio_evento.xlsx');
        },
      },
    ];
  }, [selectedEventId, selectedSubeventoId, templates]);

  const modeloSelecionado =
    opcoesExportacao.find((opcao) => opcao.id === modeloId) ?? opcoesExportacao[0];

  // Trocar de evento ou subevento muda a lista: reaponta para um modelo valido.
  useEffect(() => {
    setModeloId(opcoesExportacao[0]?.id ?? '');
  }, [opcoesExportacao]);

  const handleExport = async () => {
    if (!modeloSelecionado) return;

    setExporting(true);
    try {
      await modeloSelecionado.executar();
      showToast(`${modeloSelecionado.nome} exportado com sucesso`, 'success');
    } catch (error) {
      showToast(`Erro ao exportar ${modeloSelecionado.nome}`, 'error');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };


  const abrirDetalhes = (student: Student) => {
    setDetalhes({
      name: student.name,
      email: student.email,
      ra: student.ra,
      classGroupName: student.classGroupName,
      courseName: student.courseName,
      subEventTitle: selectedSubevento?.title,
      presence: presenceOf(student),
      checkId: student.checkId,
      checkinTime: student.checkinTime,
      checkoutTime: student.checkoutTime,
      checkinManual: student.checkinManual,
      checkoutManual: student.checkoutManual,
      checkinIp: student.checkinIp,
      checkoutIp: student.checkoutIp,
      hasCheckinPhoto: student.hasCheckinPhoto,
      hasCheckoutPhoto: student.hasCheckoutPhoto,
    });
  };

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const selectedSubevento = subeventos.find((sub) => sub.id === selectedSubeventoId);

  // A exportação usa a seleção atual: subevento específico ou evento inteiro.
  const exportScope = selectedSubevento
    ? `o subevento "${selectedSubevento.title}"`
    : selectedEvent
    ? `todos os subeventos do evento "${selectedEvent.title}"`
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

        {/* Exportação: um seletor com os modelos e um botão. Antes eram dois
            botões grandes mais uma fileira de botões menores, e nada dizia que
            uns valiam para o evento e outros só para o subevento. */}
        {selectedEventId && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo de exportação
                </label>
                <select
                  value={modeloSelecionado?.id ?? ''}
                  onChange={(e) => setModeloId(e.target.value)}
                  disabled={exporting || opcoesExportacao.length === 0}
                  className={selectClass}
                >
                  {opcoesExportacao.map((opcao) => (
                    <option key={opcao.id} value={opcao.id}>
                      {opcao.nome}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting || !modeloSelecionado}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#B7294A] text-white text-sm font-semibold hover:bg-[#9d2340] disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:w-auto w-full"
              >
                {exporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : modeloSelecionado?.formato === 'EXCEL' ? (
                  <Sheet size={18} />
                ) : (
                  <FileText size={18} />
                )}
                {exporting ? 'Exportando...' : 'Exportar'}
              </button>
            </div>

            {modeloSelecionado && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {modeloSelecionado.descricao}{' '}
                <span className="text-gray-400">Abrange {exportScope}.</span>
              </p>
            )}
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
          <button
            type="button"
            onClick={() => setSelectedSubeventoId('')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

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
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      RA
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Turma
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
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={7}>
                        <PageLoader compact message="Carregando dados de presença..." />
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {student.ra || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {student.classGroupName || <span className="text-gray-400">—</span>}
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
                        <td className="px-3 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => abrirDetalhes(student)}
                            className="inline-flex items-center gap-1.5 text-sm text-[#B7294A] hover:underline"
                          >
                            <Eye size={16} /> Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                          <p className="text-xs text-gray-500 mt-0.5">
                            {student.ra ? `RA ${student.ra}` : 'sem RA'}
                          </p>
                        </div>
                        <PresenceBadge presence={presenceOf(student)} />
                      </div>

                      {student.classGroupName && (
                        <p className="mt-2 text-xs text-gray-600 break-words">
                          {student.classGroupName}
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

                      <button
                        onClick={() => abrirDetalhes(student)}
                        className="mt-3 w-full py-2 rounded-lg border border-gray-200 text-sm text-[#B7294A] font-medium flex items-center justify-center gap-1.5"
                      >
                        <Eye size={14} /> Ver detalhes
                      </button>
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
                    Incompletos
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
                    incompletos: 0,
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
                        <span className="text-lg font-bold text-yellow-700">{subStats.incompletos}</span>
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
                incompletos: 0,
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

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center bg-blue-50 border border-blue-200 rounded-lg py-2">
                      <p className="text-[11px] text-blue-700 mb-0.5">Inscritos</p>
                      <p className="text-lg font-bold text-blue-900">{subStats.inscritos || '-'}</p>
                    </div>
                    <div className="text-center bg-green-50 border border-green-200 rounded-lg py-2">
                      <p className="text-[11px] text-green-700 mb-0.5">Presentes</p>
                      <p className="text-lg font-bold text-green-900">{subStats.presentes}</p>
                    </div>
                    <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg py-2">
                      <p className="text-[11px] text-yellow-700 mb-0.5">Incompletos</p>
                      <p className="text-lg font-bold text-yellow-700">{subStats.incompletos}</p>
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

      {detalhes && (
        <AttendanceDetailsModal subject={detalhes} onClose={() => setDetalhes(null)} />
      )}
    </div>
  );
}
