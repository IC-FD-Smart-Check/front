import api from './api';
import {
  ValidateQRRequest,
  ValidateQRResponse,
  CheckInRequest,
  CheckInResponse,
  CheckHistoryResponse,
  CheckInfoResponse,
} from '@/types';

export const checkService = {
  /**
   * Valida um QR code e retorna informações completas do evento
   */
  validateQRCode: async (request: ValidateQRRequest): Promise<CheckInfoResponse> => {
    const response = await api.get<CheckInfoResponse>('/checkin/info', { params: request });
    return response.data;
  },

  /**
   * Realiza check-in em um evento
   */
  checkIn: async (request: CheckInRequest): Promise<CheckInResponse> => {
    // Mock temporário - substituir com chamada real à API
    // await new Promise(resolve => setTimeout(resolve, 500));
    
    // return {
    //   id: '1',
    //   eventId: request.qrCode,
    //   studentId: 'student-1',
    //   checkInTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    //   message: 'Check-in realizado com sucesso!',
    // };
    
    //Implementação real (comentada)
    const response = await api.post<CheckInResponse>('/checkin', request);
    return response.data;
  },



  /**
   * Busca histórico de check-ins (Student ou Admin baseado no token)
   * O backend retorna dados diferentes dependendo do role do usuário
   */
  getCheckHistory: async (params?: {
    eventId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CheckHistoryResponse> => {
    // Mock temporário - substituir com chamada real à API
    // await new Promise(resolve => setTimeout(resolve, 500));
    
    // const records = [
    //   {
    //     id: '1',
    //     parentEvent: 'Semana Acadêmica 2026',
    //     eventName: 'Workshop de React',
    //     studentName: 'João Silva',
    //     studentEmail: 'joao@example.com',
    //     date: '22/01/2026',
    //     checkInTime: '14:05',
    //     checkOutTime: '16:10',
    //     location: 'Sala 101',
    //   },
    //   {
    //     id: '2',
    //     parentEvent: 'Semana Acadêmica 2026',
    //     eventName: 'Palestra sobre TypeScript',
    //     studentName: 'Maria Santos',
    //     studentEmail: 'maria@example.com',
    //     date: '22/01/2026',
    //     checkInTime: '14:02',
    //     checkOutTime: '16:00',
    //     location: 'Auditório Principal',
    //   },
    //   {
    //     id: '3',
    //     parentEvent: 'Hackathon 2026',
    //     eventName: 'Abertura do Evento',
    //     studentName: 'Pedro Costa',
    //     studentEmail: 'pedro@example.com',
    //     date: '22/01/2026',
    //     checkInTime: '14:15',
    //     checkOutTime: undefined,
    //     location: 'Lab de Informática',
    //   },
    // ];
    
    // return {
    //   records,
    //   totalEvents: records.length,
    //   totalCheckIns: records.filter(r => r.checkInTime).length,
    //   totalCheckOuts: records.filter(r => r.checkOutTime).length,
    //   totalCheckins: records.length,
    //   presentCount: records.filter(r => r.checkInTime).length,
    //   checkoutCount: records.filter(r => r.checkOutTime).length,
    // };
    
    // Implementação real (comentada)
    const response = await api.get<CheckHistoryResponse>('/checkin/history', { params });
    return response.data;
  },
};
