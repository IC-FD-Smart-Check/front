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

// HISTÓRICO
export interface CheckHistoryResponse {
  records: CheckResponse[];
}