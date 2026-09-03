export interface User {
  id: string;
  email?: string;
  ra?: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
  // Turma do aluno (ausente para ADMIN)
  classGroupId?: string | null;
  classGroupName?: string | null;
  semester?: Semester | null;
  courseId?: string | null;
  courseName?: string | null;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface UserRequest {
  name: string;
  email?: string;
  ra?: string;
  // Omitida na edição para manter a senha atual
  password?: string;
  role: 'STUDENT' | 'ADMIN';
  // Obrigatório quando role = STUDENT; não deve ser enviado para ADMIN
  classGroupId?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email?: string;
  ra?: string;
  role: 'STUDENT' | 'ADMIN';
  classGroupId?: string | null;
  classGroupName?: string | null;
  semester?: Semester | null;
  courseId?: string | null;
  courseName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Course types
export type Semester =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7'
  | 'S8' | 'S9' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14';

export interface CourseRequest {
  name: string;
  durationInSemesters: number;
}

export interface CourseResponse {
  id: string;
  name: string;
  durationInSemesters: number;
  createdAt?: string;
  updatedAt?: string;
}

// ClassGroup (turma) types
export interface ClassGroupRequest {
  name: string;
  /** Identificador da turma no sistema externo, usado na importação de alunos */
  externalCode?: string;
  semester: Semester;
  courseId: string;
}

export interface ClassGroupResponse {
  id: string;
  name: string;
  externalCode?: string | null;
  semester: Semester;
  semesterNumber: number;
  courseId: string;
  courseName: string;
  createdAt?: string;
  updatedAt?: string;
}

// Importação de alunos
export type ImportAction = 'CREATE' | 'UPDATE' | 'SKIP';

export interface ImportTemplateResponse {
  id: string;
  name: string;
  description: string;
  acceptedExtensions: string[];
}

export interface ImportStudent {
  ra: string;
  name: string;
  action: ImportAction;
  /** Senha inicial gerada — preenchida apenas para alunos novos */
  generatedPassword?: string | null;
  /** Motivo, quando o aluno não pôde ser importado */
  reason?: string | null;
}

export interface ImportClassGroup {
  externalCode: string | null;
  fileCourseName?: string | null;
  filePeriod?: string | null;
  /** Semestre extraído do período do arquivo ("2º Semestre" -> 2) */
  fileSemesterNumber?: number | null;
  /** true quando existe turma cadastrada com este identificador */
  matched: boolean;
  classGroupId?: string | null;
  classGroupName?: string | null;
  classGroupSemester?: Semester | null;
  courseName?: string | null;
  warnings: string[];
  students: ImportStudent[];
}

export interface StudentImportResponse {
  templateId: string;
  templateName: string;
  /** false = preview (nada gravado), true = importação efetivada */
  executed: boolean;
  totalClassGroups: number;
  totalStudents: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  classGroups: ImportClassGroup[];
}

// Dashboard types
export interface DashboardStatsResponse {
  /** Eventos não cancelados que ainda não terminaram */
  activeEvents: number;
  /** Check-ins realizados hoje */
  checkinsToday: number;
  /** Usuários distintos com pelo menos um check-in */
  totalParticipants: number;
  /** Percentual de inscrições que viraram presença completa */
  attendanceRate: number;
}

// Event types
export interface EventRequest {
  title: string;
  description?: string;
  imageBase64?: string;
  latitude?: number;
  longitude?: number;
  startDate: string;
  endDate: string;
}

export interface EventResponse {
  id: string;
  title: string;
  description?: string;
  imageBase64?: string;
  latitude?: number;
  longitude?: number;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
}

// SubEvent types
export interface SubEventRequest {
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  locationDescription?: string;
  startDate: string;
  endDate: string;
  checkinStart: string;
  checkinEnd: string;
  checkoutStart: string;
  checkoutEnd: string;
  eventId: string;
}

export interface SubEventResponse {
  id: string;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  locationDescription?: string;
  startDate: string;
  endDate: string;
  checkinStart: string;
  checkinEnd: string;
  checkoutStart: string;
  checkoutEnd: string;
  eventId: string;
  eventTitle: string;
  createdAt?: string;
  updatedAt?: string;
}

// QRCode types
export interface QRCodeResponse {
  id: string;
  codeData: string;
  subEventId: string;
  subEventTitle: string;
  isActive: boolean;
  createdAt: string;
}

// GEOLOCALIZAÇÃO SEGURA
export interface GeoPayload {
  latitude: number;
  longitude: number;
  timestamp: number;
  deviceId: string;
}

// CHECK-IN REQUEST (NOVA ESTRUTURA)
export interface CheckRequest {
  requestId: string;
  qrCode: string;
  type: 'CHECKIN' | 'CHECKOUT';
  geoPayload: GeoPayload;
  signature: string;
}

// CHECK-IN RESPONSE
export interface CheckResponse {
  id: string;
  eventId: string;
  eventTitle: string;
  subEventId: string;
  subEventTitle: string;
  userId: string;
  userName: string;
  type: 'CHECKIN' | 'CHECKOUT';
  checkinTime: string | null;
  checkoutTime: string | null;
  createdAt: string;
  message: string;
}

// CHECK INFO (QR CODE VALIDATION)
export interface CheckInfoResponse {
  // Evento
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  
  // SubEvento
  subEventId: string;
  subEventTitle: string;
  subEventDescription: string;
  locationDescription: string;
  startDate: string;
  endDate: string;
  
  // Janelas
  checkinStart: string;
  checkinEnd: string;
  checkoutStart: string;
  checkoutEnd: string;
  
  // Ação
  actionType: 'CHECKIN' | 'CHECKOUT' | 'COMPLETED';
  message: string;
  
  // Status
  hasCheckedIn: boolean;
  checkinTime: string | null;
  hasCheckedOut: boolean;
  checkoutTime: string | null;
  
  // Validações
  canPerformAction: boolean;
  validationMessage: string | null;
}

// Subscription types
export interface SubscriptionResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  subEventId: string;
  subEventTitle: string;
  createdAt: string;
}