import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { termsService } from '@/services';
import type { TermsDocument } from '@/types';

interface TermsContentProps {
  /** Avisa quem usa qual versão foi carregada, para enviar no aceite. */
  onLoad?: (documento: TermsDocument) => void;
  /** Altura máxima da área de leitura; sem isto o texto domina a tela. */
  className?: string;
}

/**
 * Texto dos termos, buscado do servidor.
 *
 * Vive num componente próprio porque aparece em dois lugares: na tela de
 * primeiro acesso, antes do aceite, e na página aberta pelo menu, para quem
 * quiser reler depois. Os dois mostram exatamente o mesmo conteúdo, o que só
 * é garantido tendo uma origem só.
 */
const TermsContent: React.FC<TermsContentProps> = ({ onLoad, className = '' }) => {
  const [documento, setDocumento] = useState<TermsDocument | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    termsService
      .current()
      .then((doc) => {
        if (cancelado) return;
        setDocumento(doc);
        onLoad?.(doc);
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (erro) {
    return (
      <div className={`flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 ${className}`}>
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />
        <p>Não foi possível carregar os termos agora. Verifique sua conexão e tente novamente.</p>
      </div>
    );
  }

  if (!documento) {
    return <p className={`text-sm text-gray-500 ${className}`}>Carregando os termos...</p>;
  }

  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-3">
        Versão {documento.version} · atualizado em {documento.updatedAt}
      </p>

      {documento.sections.map((secao) => (
        <section key={secao.title} className="mb-4 last:mb-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{secao.title}</h3>
          {secao.paragraphs.map((paragrafo, i) => (
            <p key={i} className="text-sm text-gray-600 leading-relaxed mb-2 last:mb-0">
              {paragrafo}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
};

export default TermsContent;
