import React, { useEffect, useState } from 'react';
import { X, ImageOff } from 'lucide-react';
import { checkService } from '@/services';

/**
 * Contrato mínimo em vez de CheckResponse inteiro: a tela de relatório monta as
 * linhas a partir de inscrições e checks agregados, não de um CheckResponse.
 * Assim os dois formatos usam o mesmo modal sem conversão.
 */
export interface PhotoSubject {
  /** id do check, não do aluno */
  id: string;
  userName: string;
  subEventTitle: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  hasCheckinPhoto?: boolean;
  hasCheckoutPhoto?: boolean;
}

interface CheckPhotoModalProps {
  record: PhotoSubject;
  onClose: () => void;
}

type Slot = { url: string | null; error: string | null };

const vazio: Slot = { url: null, error: null };

const CheckPhotoModal: React.FC<CheckPhotoModalProps> = ({ record, onClose }) => {
  const [entrada, setEntrada] = useState<Slot>(vazio);
  const [saida, setSaida] = useState<Slot>(vazio);

  useEffect(() => {
    const criadas: string[] = [];
    let cancelled = false;

    const carregar = (
      tipo: 'CHECKIN' | 'CHECKOUT',
      existe: boolean | undefined,
      set: React.Dispatch<React.SetStateAction<Slot>>,
    ) => {
      if (!existe) {
        set({ url: null, error: 'Sem foto' });
        return;
      }
      checkService
        .getPhotoUrl(record.id, tipo)
        .then((u) => {
          if (cancelled) {
            URL.revokeObjectURL(u);
            return;
          }
          criadas.push(u);
          set({ url: u, error: null });
        })
        .catch(() => set({ url: null, error: 'Não foi possível carregar' }));
    };

    carregar('CHECKIN', record.hasCheckinPhoto, setEntrada);
    carregar('CHECKOUT', record.hasCheckoutPhoto, setSaida);

    // Sem revogar, cada abertura do modal deixa blobs presos na memória da aba.
    return () => {
      cancelled = true;
      criadas.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [record.id, record.hasCheckinPhoto, record.hasCheckoutPhoto]);

  const Foto: React.FC<{ titulo: string; hora: string | null; slot: Slot }> = ({
    titulo,
    hora,
    slot,
  }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <span className="text-xs font-semibold text-gray-700">{titulo}</span>
        {hora && (
          <span className="text-xs text-gray-500 shrink-0">
            {new Date(hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="bg-gray-900 rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
        {slot.url ? (
          <img src={slot.url} alt={titulo} className="w-full h-full object-cover" />
        ) : slot.error ? (
          <div className="text-center text-gray-400 px-3">
            <ImageOff size={22} className="mx-auto mb-1 opacity-60" />
            <p className="text-xs">{slot.error}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Carregando...</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{record.userName}</h3>
            <p className="text-xs text-gray-500 truncate">{record.subEventTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Lado a lado de propósito: a comparação entre quem entrou e quem saiu
            é justamente o que o professor quer enxergar de uma vez. */}
        <div className="p-4 flex gap-3">
          <Foto titulo="Entrada" hora={record.checkinTime} slot={entrada} />
          <Foto titulo="Saída" hora={record.checkoutTime} slot={saida} />
        </div>
      </div>
    </div>
  );
};

export default CheckPhotoModal;
