import React from 'react';
import { Camera } from 'lucide-react';
import Button from '@/components/common/Button';

interface CheckinInitialProps {
  onOpenCamera: () => void;
}

const CheckinInitial: React.FC<CheckinInitialProps> = ({ onOpenCamera }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] px-4 sm:px-6 py-8 sm:py-12 text-white text-center">
          <Camera size={40} className="mx-auto mb-4 sm:w-12 sm:h-12" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Check-in de Eventos</h2>
          <p className="text-sm sm:text-base text-white/90">
            Escaneie o QR code do evento para fazer check-in
          </p>
        </div>

        <div className="p-5 sm:p-8 md:p-12 flex flex-col items-center gap-4 sm:gap-6">
          <div className="text-center mb-1 sm:mb-4">
            <p className="text-sm sm:text-base text-gray-600 mb-1.5">
              Toque no botão abaixo para abrir a câmera
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Você precisará permitir o acesso à câmera e à localização
            </p>
          </div>

          <Button onClick={onOpenCamera} fullWidth className="py-3.5 sm:py-4 text-base sm:text-lg flex items-center justify-center gap-2">
            <Camera size={20} />
            Abrir Câmera
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckinInitial;