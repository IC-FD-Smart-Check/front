import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Users } from 'lucide-react';
import { classGroupService, courseService } from '@/services';
import type {
  ClassGroupRequest,
  ClassGroupResponse,
  CourseRequest,
  CourseResponse,
} from '@/types';
import { semesterLabel } from '@/utils/semester';
import { useToast } from '@/hooks';
import Button from '@/components/common/Button';
import ClassGroupForm from '@/components/common/ClassGroupForm';
import ClassGroupStudentsModal from '@/components/common/ClassGroupStudentsModal';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import CourseForm from '@/components/common/CourseForm';
import PageLoader from '@/components/common/PageLoader';
import Toast from '@/components/common/Toast';

type TabKey = 'courses' | 'classGroups';

const Academic: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('courses');

  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de curso aplicado na aba de turmas
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [courseModal, setCourseModal] = useState<{ isOpen: boolean; course: CourseResponse | null }>({
    isOpen: false,
    course: null,
  });
  const [classGroupModal, setClassGroupModal] = useState<{
    isOpen: boolean;
    classGroup: ClassGroupResponse | null;
  }>({
    isOpen: false,
    classGroup: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentsModal, setStudentsModal] = useState<{
    isOpen: boolean;
    classGroup: ClassGroupResponse | null;
  }>({ isOpen: false, classGroup: null });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: TabKey | null;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesData, classGroupsData] = await Promise.all([
        courseService.getAllCourses(),
        classGroupService.getAllClassGroups(),
      ]);
      setCourses(coursesData);
      setClassGroups(classGroupsData);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Não foi possível carregar cursos e turmas. Tente novamente.';
      showToast(errorMessage, 'error');
      console.error('Erro ao buscar cursos e turmas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quantidade de turmas por curso, usada na listagem de cursos
  const classGroupCountByCourse = useMemo(() => {
    return classGroups.reduce<Record<string, number>>((acc, classGroup) => {
      acc[classGroup.courseId] = (acc[classGroup.courseId] || 0) + 1;
      return acc;
    }, {});
  }, [classGroups]);

  const filteredCourses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return courses;
    return courses.filter((course) => course.name.toLowerCase().includes(search));
  }, [courses, searchTerm]);

  const filteredClassGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return classGroups.filter((classGroup) => {
      const matchesCourse = courseFilter === 'ALL' || classGroup.courseId === courseFilter;
      const matchesSearch =
        !search ||
        classGroup.name.toLowerCase().includes(search) ||
        classGroup.courseName.toLowerCase().includes(search) ||
        (classGroup.externalCode?.toLowerCase().includes(search) ?? false);

      return matchesCourse && matchesSearch;
    });
  }, [classGroups, courseFilter, searchTerm]);

  const handleChangeTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  // ----- Cursos -----

  const handleSubmitCourse = async (data: CourseRequest) => {
    try {
      setIsSubmitting(true);

      if (courseModal.course) {
        const updated = await courseService.updateCourse(courseModal.course.id, data);
        setCourses((prev) => prev.map((course) => (course.id === updated.id ? updated : course)));
        // O nome do curso aparece nas turmas, então precisa ser propagado
        setClassGroups((prev) =>
          prev.map((classGroup) =>
            classGroup.courseId === updated.id
              ? { ...classGroup, courseName: updated.name }
              : classGroup
          )
        );
        showToast('Curso atualizado com sucesso!', 'success');
      } else {
        const created = await courseService.createCourse(data);
        setCourses((prev) => [...prev, created]);
        showToast('Curso criado com sucesso!', 'success');
      }

      setCourseModal({ isOpen: false, course: null });
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Não foi possível salvar o curso. Tente novamente.',
        'error'
      );
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- Turmas -----

  const handleSubmitClassGroup = async (data: ClassGroupRequest) => {
    try {
      setIsSubmitting(true);

      if (classGroupModal.classGroup) {
        const updated = await classGroupService.updateClassGroup(
          classGroupModal.classGroup.id,
          data
        );
        setClassGroups((prev) =>
          prev.map((classGroup) => (classGroup.id === updated.id ? updated : classGroup))
        );
        showToast('Turma atualizada com sucesso!', 'success');
      } else {
        const created = await classGroupService.createClassGroup(data);
        setClassGroups((prev) => [...prev, created]);
        showToast('Turma criada com sucesso!', 'success');
      }

      setClassGroupModal({ isOpen: false, classGroup: null });
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Não foi possível salvar a turma. Tente novamente.',
        'error'
      );
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- Exclusão -----

  const handleConfirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    try {
      setIsDeleting(true);

      if (deleteModal.type === 'courses') {
        await courseService.deleteCourse(deleteModal.id);
        setCourses((prev) => prev.filter((course) => course.id !== deleteModal.id));
        showToast('Curso excluído com sucesso!', 'success');
      } else {
        await classGroupService.deleteClassGroup(deleteModal.id);
        setClassGroups((prev) => prev.filter((classGroup) => classGroup.id !== deleteModal.id));
        showToast('Turma excluída com sucesso!', 'success');
      }

      setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Não foi possível excluir. Tente novamente.',
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <PageLoader message="Carregando cursos e turmas..." />;
  }

  const isCoursesTab = activeTab === 'courses';

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Cursos e Turmas</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Cadastre os cursos da faculdade e as turmas que serão vinculadas aos alunos
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4 sm:mb-6 border-b border-gray-200">
        <button
          onClick={() => handleChangeTab('courses')}
          className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            isCoursesTab
              ? 'border-[#B7294A] text-[#B7294A]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <GraduationCap size={18} />
          Cursos ({courses.length})
        </button>
        <button
          onClick={() => handleChangeTab('classGroups')}
          className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            !isCoursesTab
              ? 'border-[#B7294A] text-[#B7294A]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={18} />
          Turmas ({classGroups.length})
        </button>
      </div>

      {/* Barra de ações e filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 w-full">
            <input
              type="text"
              placeholder={
                isCoursesTab ? 'Buscar por nome do curso...' : 'Buscar por turma, curso ou identificador...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent"
            />

            {/* Filtro por curso (somente na aba de turmas) */}
            {!isCoursesTab && (
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent bg-white"
              >
                <option value="ALL">Todos os cursos</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isCoursesTab ? (
            <Button
              onClick={() => setCourseModal({ isOpen: true, course: null })}
              className="whitespace-nowrap w-full md:w-auto !py-2.5"
            >
              + Novo Curso
            </Button>
          ) : (
            <Button
              onClick={() => setClassGroupModal({ isOpen: true, classGroup: null })}
              className="whitespace-nowrap w-full md:w-auto !py-2.5"
              disabled={courses.length === 0}
            >
              + Nova Turma
            </Button>
          )}
        </div>

        <div className="mt-3 sm:mt-4 text-sm text-gray-600">
          {isCoursesTab
            ? `Exibindo ${filteredCourses.length} de ${courses.length} curso(s)`
            : `Exibindo ${filteredClassGroups.length} de ${classGroups.length} turma(s)`}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isCoursesTab ? (
          filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'Nenhum curso encontrado com a busca aplicada' : 'Nenhum curso cadastrado'}
            </div>
          ) : (
            <>
            {/* Cards — celular */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredCourses.map((course) => (
                <div key={course.id} className="p-4">
                  <p className="font-medium text-gray-900 break-words">{course.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                    <span>
                      {course.durationInSemesters}{' '}
                      {course.durationInSemesters === 1 ? 'semestre' : 'semestres'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {classGroupCountByCourse[course.id] || 0} turma(s)
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setCourseModal({ isOpen: true, course })}
                      className="flex-1 px-3 py-2 text-sm text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          type: 'courses',
                          id: course.id,
                          name: `o curso ${course.name}`,
                        })
                      }
                      className="flex-1 px-3 py-2 text-sm text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela — tablet/desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Curso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duração
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turmas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{course.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {course.durationInSemesters}{' '}
                          {course.durationInSemesters === 1 ? 'semestre' : 'semestres'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {classGroupCountByCourse[course.id] || 0} turma(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setCourseModal({ isOpen: true, course })}
                            className="px-3 py-1 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                type: 'courses',
                                id: course.id,
                                name: `o curso ${course.name}`,
                              })
                            }
                            className="px-3 py-1 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )
        ) : filteredClassGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {courses.length === 0
              ? 'Cadastre um curso antes de criar turmas'
              : searchTerm || courseFilter !== 'ALL'
              ? 'Nenhuma turma encontrada com os filtros aplicados'
              : 'Nenhuma turma cadastrada'}
          </div>
        ) : (
          <>
          {/* Cards — celular */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredClassGroups.map((classGroup) => (
              <div key={classGroup.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 break-words">{classGroup.name}</p>
                    <p className="text-sm text-gray-600 break-words">{classGroup.courseName}</p>
                  </div>
                  <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {semesterLabel(classGroup.semester)}
                  </span>
                </div>
                {classGroup.externalCode && (
                  <code className="inline-block mt-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {classGroup.externalCode}
                  </code>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setStudentsModal({ isOpen: true, classGroup })}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-700 hover:text-white border border-gray-400 rounded-lg transition-colors"
                  >
                    Alunos
                  </button>
                  <button
                    onClick={() => setClassGroupModal({ isOpen: true, classGroup })}
                    className="flex-1 px-3 py-2 text-sm text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      setDeleteModal({
                        isOpen: true,
                        type: 'classGroups',
                        id: classGroup.id,
                        name: `a turma ${classGroup.name}`,
                      })
                    }
                    className="flex-1 px-3 py-2 text-sm text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela — tablet/desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Turma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identificador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semestre
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClassGroups.map((classGroup) => (
                  <tr key={classGroup.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{classGroup.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{classGroup.courseName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {classGroup.externalCode ? (
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {classGroup.externalCode}
                        </code>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {semesterLabel(classGroup.semester)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setStudentsModal({ isOpen: true, classGroup })}
                          className="px-3 py-1 text-gray-700 hover:bg-gray-700 hover:text-white border border-gray-400 rounded-lg transition-colors"
                        >
                          Alunos
                        </button>
                        <button
                          onClick={() => setClassGroupModal({ isOpen: true, classGroup })}
                          className="px-3 py-1 text-[#B7294A] hover:bg-[#B7294A] hover:text-white border border-[#B7294A] rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              type: 'classGroups',
                              id: classGroup.id,
                              name: `a turma ${classGroup.name}`,
                            })
                          }
                          className="px-3 py-1 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-lg transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Modal de curso */}
      <CourseForm
        isOpen={courseModal.isOpen}
        course={courseModal.course}
        onClose={() => !isSubmitting && setCourseModal({ isOpen: false, course: null })}
        onSubmit={handleSubmitCourse}
        isSubmitting={isSubmitting}
      />

      {/* Modal de turma */}
      <ClassGroupForm
        isOpen={classGroupModal.isOpen}
        classGroup={classGroupModal.classGroup}
        courses={courses}
        defaults={{ courseId: courseFilter !== 'ALL' ? courseFilter : '' }}
        onClose={() => !isSubmitting && setClassGroupModal({ isOpen: false, classGroup: null })}
        onSubmit={handleSubmitClassGroup}
        isSubmitting={isSubmitting}
      />

      {/* Alunos da turma */}
      <ClassGroupStudentsModal
        isOpen={studentsModal.isOpen}
        classGroup={studentsModal.classGroup}
        onClose={() => setStudentsModal({ isOpen: false, classGroup: null })}
      />

      {/* Modal de exclusão */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          !isDeleting && setDeleteModal({ isOpen: false, type: null, id: null, name: '' })
        }
        isDeleting={isDeleting}
      />

      {/* Toast de notificação */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default Academic;
