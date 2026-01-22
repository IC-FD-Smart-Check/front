import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Carregando...', isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-white">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
