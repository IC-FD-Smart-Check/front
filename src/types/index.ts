export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface LoginRequest {
  email: string;
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
  email: string;
  password: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

// Check-in types
export interface EventInfo {
  id: string;
  name: string;
  parentEvent: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  hasCheckedIn: boolean;
}

export interface CheckInfoResponse {
  // Informações do Evento
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  
  // Informações do SubEvento
  subEventId: string;
  subEventTitle: string;
  subEventDescription: string;
  locationDescription: string;
  startDate: string;
  endDate: string;
  
  // Janelas de Check-in/Checkout
  checkinStart: string;
  checkinEnd: string;
  checkoutStart: string;
  checkoutEnd: string;
  
  // Ação que o usuário deve realizar
  actionType: 'CHECKIN' | 'CHECKOUT';
  
  // Mensagem explicativa
  message: string;
  
  // Status do check anterior (se houver)
  hasCheckedIn: boolean;
  checkinTime: string | null;
  hasCheckedOut: boolean;
  checkoutTime: string | null;
  
  // Validações
  canPerformAction: boolean;
  validationMessage: string | null;
}

export interface CheckRecord {
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
  message?: string;
}

export interface ValidateQRRequest {
  qrCode: string;
}

export interface ValidateQRResponse {
  eventInfo?: EventInfo; // Manter para compatibilidade
  checkInfo?: CheckInfoResponse; // Nova resposta completa
}

export interface CheckInRequest {
  qrCode: string;
  type: 'CHECKIN' | 'CHECKOUT';
  latitude: number;
  longitude: number;
}

export interface CheckInResponse {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  type: 'CHECKIN' | 'CHECKOUT';
  checkinTime: string | null;
  checkoutTime: string | null;
  createdAt: string;
  message: string;
}

export interface CheckHistoryResponse {
  records?: CheckRecord[];
  totalEvents?: number;
  totalCheckIns?: number;
  totalCheckOuts?: number;
  totalCheckins?: number;
  presentCount?: number;
  checkoutCount?: number;
}