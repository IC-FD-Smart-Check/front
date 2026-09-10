import React from 'react';

interface PageLoaderProps {
  /** Texto abaixo do spinner. Passe string vazia para exibir só o spinner. */
  message?: string;
  /** Versão reduzida, para blocos dentro de uma página ou modal */
  compact?: boolean;
}

/**
 * Loading padrão do sistema: spinner na cor da marca sobre o fundo da própria tela.
 * Use este componente em toda espera de página ou bloco — o overlay escuro
 * (LoadingOverlay) é exclusivo do scanner, onde o fundo já é a câmera.
 */
const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Carregando...', compact = false }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-3 text-gray-600 ${
      compact ? 'py-8' : 'py-16'
    }`}
  >
    <div
      className={`animate-spin rounded-full border-b-2 border-[#B7294A] ${
        compact ? 'h-6 w-6' : 'h-8 w-8'
      }`}
    />
    {message && <span className="text-sm">{message}</span>}
  </div>
);

export default PageLoader;
