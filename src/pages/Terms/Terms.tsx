import React from 'react';
import { FileText } from 'lucide-react';
import TermsContent from '@/components/common/TermsContent';

/**
 * Termos abertos pelo menu, para reler a qualquer momento.
 *
 * Existe porque aceitar algo que não se pode consultar depois não vale muita
 * coisa: a pessoa precisa conseguir voltar ao texto sem depender de alguém.
 */
const Terms: React.FC = () => (
  <div className="max-w-3xl mx-auto">
    <div className="mb-5 sm:mb-6 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#B7294A]/10 flex items-center justify-center flex-shrink-0">
        <FileText size={18} className="text-[#B7294A]" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Termos de uso</h1>
        <p className="text-sm text-gray-500 mt-1">
          O que o sistema coleta, para que serve e o que não é permitido
        </p>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
      <TermsContent />
    </div>
  </div>
);

export default Terms;
