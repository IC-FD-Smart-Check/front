import React from 'react';
import { useAuthStore } from '@/store/authStore';
import StudentCheck from '@/components/check/student/StudentCheck';
import AdminCheck from '@/components/check/admin/AdminCheck';

const Check: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Check-in de Eventos</h1>
        <p className="text-sm sm:text-base text-gray-600">
          {user?.role === 'ADMIN'
            ? 'Acompanhe o histórico de check-ins e presença dos estudantes'
            : 'Escaneie o QR code do evento para realizar check-in ou check-out'}
        </p>
      </div>

      {/* Content */}
      {user?.role === 'ADMIN' ? <AdminCheck /> : <StudentCheck />}
    </div>
  );
};

export default Check;
