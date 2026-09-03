import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { classGroupService, courseService, importService } from '@/services';
import type {
  ClassGroupRequest,
  CourseRequest,
  CourseResponse,
  ImportClassGroup,
  ImportTemplateResponse,
  Semester,
  StudentImportResponse,
} from '@/types';
import { numberToSemester } from '@/utils/semester';
import { suggestClassGroupName } from '@/utils/classGroupName';
import { useToast } from '@/hooks';
import Button from '@/components/common/Button';
import ClassGroupForm from '@/components/common/ClassGroupForm';
import type { ClassGroupFormDefaults } from '@/components/common/ClassGroupForm';
import CourseForm from '@/components/common/CourseForm';
import ImportClassGroupCard from '@/components/import/ImportClassGroupCard';
import ImportSummary from '@/components/import/ImportSummary';
import Toast from '@/components/common/Toast';

/** Compara nomes de curso ignorando caixa e acento */
const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

const StudentImport: React.FC = () => {
  const [templates, setTemplates] = useState<ImportTemplateResponse[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [result, setResult] = useState<StudentImportResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Cadastro de turma/curso direto desta tela
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [classGroupModal, setClassGroupModal] = useState<{
    isOpen: boolean;
    defaults: ClassGroupFormDefaults;
  }>({ isOpen: false, defaults: {} });
  const [courseModal, setCourseModal] = useState<{ isOpen: boolean; defaultName: string }>({
    isOpen: false,
    defaultName: '',
  });
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  // Turma que originou o cadastro de curso, para reabrir o form de turma depois
  const pendingClassGroup = useRef<ImportClassGroup | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // O preview já foi confirmado?
  const isExecuted = result?.executed ?? false;

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await importService.getTemplates();
        setTemplates(data);

        // Com um único template, já deixa selecionado
        if (data.length === 1) {
          setSelectedTemplateId(data[0].id);
        }
      } catch (err: any) {
        showToast(
          err.response?.data?.message || 'Não foi possível carregar os templates de importação.',
          'error'
        );
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [showToast]);

  // Cursos são necessários para o atalho de cadastro de turma
  const loadCourses = useCallback(async () => {
    try {
      const data = await courseService.getAllCourses();
      setCourses(data);
      return data;
    } catch {
      return [] as CourseResponse[];
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setResult(null);
  };

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedTemplateId || !file) return;

    try {
      setIsAnalyzing(true);
      const data = await importService.preview(selectedTemplateId, file);
      setResult(data);

      if (data.toCreate === 0 && data.toUpdate === 0) {
        showToast('Nenhum aluno deste arquivo pode ser importado. Confira os avisos.', 'warning');
      } else {
        showToast('Arquivo lido. Confira os dados antes de confirmar.', 'success');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Não foi possível ler o arquivo. Tente novamente.';
      showToast(message, 'error');
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTemplateId || !file) return;

    try {
      setIsImporting(true);
      const data = await importService.execute(selectedTemplateId, file);
      setResult(data);
      showToast(
        `Importação concluída: ${data.toCreate} aluno(s) criado(s) e ${data.toUpdate} atualizado(s).`,
        'success'
      );
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Não foi possível concluir a importação. Tente novamente.',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  };

  /** Reanalisa o arquivo já selecionado, para o card refletir a turma recém-cadastrada */
  const reanalyze = async () => {
    if (!selectedTemplateId || !file) return;

    try {
      const data = await importService.preview(selectedTemplateId, file);
      setResult(data);
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Turma cadastrada, mas não foi possível reanalisar o arquivo.',
        'warning'
      );
    }
  };

  /**
   * Abre o cadastro de turma já preenchido com o que veio do arquivo.
   * Se o curso do arquivo não estiver cadastrado, abre antes o cadastro de curso.
   */
  const handleRegisterClassGroup = (classGroup: ImportClassGroup, availableCourses = courses) => {
    const fileCourseName = classGroup.fileCourseName ?? '';
    const matchedCourse = fileCourseName
      ? availableCourses.find((course) => normalizeName(course.name) === normalizeName(fileCourseName))
      : undefined;

    if (!matchedCourse) {
      // Sem o curso não dá para cadastrar a turma — cadastra o curso primeiro
      pendingClassGroup.current = classGroup;
      setCourseModal({ isOpen: true, defaultName: fileCourseName });
      showToast(
        `O curso "${fileCourseName}" ainda não está cadastrado. Cadastre-o para continuar.`,
        'warning'
      );
      return;
    }

    // Só pré-seleciona o semestre se ele couber na duração do curso —
    // senão o select ficaria em branco carregando um valor que o backend recusa
    const fileSemester = classGroup.fileSemesterNumber;
    const semester: Semester | '' =
      fileSemester && fileSemester >= 1 && fileSemester <= matchedCourse.durationInSemesters
        ? numberToSemester(fileSemester)
        : '';

    setClassGroupModal({
      isOpen: true,
      defaults: {
        // Nome legível derivado do curso e do semestre; o identificador cru fica no campo próprio
        name: suggestClassGroupName({
          courseName: matchedCourse.name,
          semesterNumber: classGroup.fileSemesterNumber,
          externalCode: classGroup.externalCode,
        }),
        externalCode: classGroup.externalCode ?? '',
        semester,
        courseId: matchedCourse.id,
      },
    });
  };

  const handleSubmitClassGroup = async (data: ClassGroupRequest) => {
    try {
      setIsSavingAcademic(true);
      const created = await classGroupService.createClassGroup(data);
      setClassGroupModal({ isOpen: false, defaults: {} });
      showToast(`Turma "${created.name}" cadastrada. Reanalisando o arquivo...`, 'success');
      await reanalyze();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Não foi possível cadastrar a turma. Tente novamente.',
        'error'
      );
      throw err;
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const handleSubmitCourse = async (data: CourseRequest) => {
    try {
      setIsSavingAcademic(true);
      const created = await courseService.createCourse(data);
      const updatedCourses = await loadCourses();
      setCourseModal({ isOpen: false, defaultName: '' });
      showToast(`Curso "${created.name}" cadastrado.`, 'success');

      // Retoma o cadastro da turma que disparou o fluxo
      const pending = pendingClassGroup.current;
      pendingClassGroup.current = null;
      if (pending) {
        handleRegisterClassGroup(pending, updatedCourses);
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Não foi possível cadastrar o curso. Tente novamente.',
        'error'
      );
      throw err;
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isBusy = isAnalyzing || isImporting;
  const acceptedExtensions = selectedTemplate?.acceptedExtensions.join(',') ?? '.csv';

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Importar Alunos</h1>
        <p className="text-gray-600">
          Envie o relatório exportado pelo sistema acadêmico. Os alunos são vinculados às turmas
          pelo identificador cadastrado em Cursos e Turmas.
        </p>
      </div>

      {/* Passo 1 — template e arquivo */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 mb-1">
              Template de importação <span className="text-red-500">*</span>
            </label>
            <select
              id="templateId"
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              disabled={isBusy || loadingTemplates || isExecuted}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <option value="">
                {loadingTemplates ? 'Carregando templates...' : 'Selecione o sistema de origem'}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-xs text-gray-500 mt-1">{selectedTemplate.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              Arquivo <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept={acceptedExtensions}
              onChange={handleSelectFile}
              disabled={isBusy || !selectedTemplateId || isExecuted}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] disabled:opacity-50 disabled:cursor-not-allowed file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[#B7294A]/10 file:text-[#B7294A] hover:file:bg-[#B7294A]/20"
            />
            {!selectedTemplateId && !loadingTemplates && (
              <p className="text-xs text-gray-500 mt-1">Selecione um template primeiro.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleAnalyze} disabled={!selectedTemplateId || !file || isBusy || isExecuted}>
              {isAnalyzing ? 'Lendo arquivo...' : 'Analisar arquivo'}
            </Button>

            {(result || file) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuted ? 'Nova importação' : 'Limpar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Passo 2 — preview / resultado */}
      {result && (
        <div className="space-y-6">
          {isExecuted && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-green-800">Importação concluída</h3>
                <p className="text-sm text-green-700">
                  {result.toCreate} aluno(s) criado(s), {result.toUpdate} atualizado(s) e{' '}
                  {result.toSkip} ignorado(s).
                </p>
              </div>
            </div>
          )}

          <ImportSummary result={result} />

          {result.toSkip > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">
                  {result.toSkip} aluno(s) não {isExecuted ? 'foram' : 'serão'} importado(s)
                </h3>
                <p className="text-sm text-yellow-700">
                  As turmas destacadas abaixo não têm cadastro com o identificador do arquivo.
                  Cadastre a turma em Cursos e Turmas e envie o arquivo de novo para incluí-los.
                </p>
              </div>
            </div>
          )}

          {/* Confirmação */}
          {!isExecuted && (
            <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm text-gray-600">
                Nada foi gravado ainda. Confira os dados abaixo e confirme para importar.
              </p>
              <Button
                onClick={handleConfirm}
                disabled={isBusy || (result.toCreate === 0 && result.toUpdate === 0)}
                className="whitespace-nowrap"
              >
                <span className="flex items-center gap-2">
                  <Upload size={16} />
                  {isImporting ? 'Importando...' : 'Confirmar importação'}
                </span>
              </Button>
            </div>
          )}

          {/* Turmas */}
          {result.classGroups.map((classGroup, index) => (
            <ImportClassGroupCard
              key={classGroup.externalCode ?? index}
              classGroup={classGroup}
              executed={isExecuted}
              onRegisterClassGroup={handleRegisterClassGroup}
            />
          ))}
        </div>
      )}

      {/* Atalho: cadastrar a turma que falta, já preenchida com os dados do arquivo */}
      <ClassGroupForm
        isOpen={classGroupModal.isOpen}
        classGroup={null}
        courses={courses}
        defaults={classGroupModal.defaults}
        onClose={() => !isSavingAcademic && setClassGroupModal({ isOpen: false, defaults: {} })}
        onSubmit={handleSubmitClassGroup}
        isSubmitting={isSavingAcademic}
      />

      {/* Atalho: cadastrar o curso quando ele ainda não existe */}
      <CourseForm
        isOpen={courseModal.isOpen}
        course={null}
        defaultName={courseModal.defaultName}
        onClose={() => {
          if (isSavingAcademic) return;
          pendingClassGroup.current = null;
          setCourseModal({ isOpen: false, defaultName: '' });
        }}
        onSubmit={handleSubmitCourse}
        isSubmitting={isSavingAcademic}
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

export default StudentImport;
