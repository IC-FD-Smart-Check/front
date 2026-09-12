import React, { useEffect, useState } from 'react';
import { X, ImageOff, Hand, Smartphone } from 'lucide-react';
import { checkService } from '@/services';

/**
 * Tudo o que se sabe sobre a presença de um aluno num subevento.
 *
 * A tabela do relatório mostra só o essencial; o que é detalhe de apuração
 * (e-mail, curso, IP, origem do registro, fotos) vive aqui.
 */
export interface AttendanceDetailsSubject {
  name: string;
  email?: string;
  ra?: string;
  classGroupName?: string;
  courseName?: string;
  subEventTitle?: string;
  presence: string;
  /** id do registro de check; ausente quando o aluno não tem registro nenhum */
  checkId?: string;
  checkinTime?: string;
  checkoutTime?: string;
  checkinManual?: boolean;
  checkoutManual?: boolean;
  checkinIp?: string | null;
  checkoutIp?: string | null;
  hasCheckinPhoto?: boolean;
  hasCheckoutPhoto?: boolean;
}

interface AttendanceDetailsModalProps {
  subject: AttendanceDetailsSubject;
  onClose: () => void;
}

const formatar = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;

const AttendanceDetailsModal: React.FC<AttendanceDetailsModalProps> = ({ subject, onClose }) => {
  const [fotos, setFotos] = useState<{ entrada?: string; saida?: string }>({});
  const [erroFoto, setErroFoto] = useState(false);

  useEffect(() => {
    if (!subject.checkId) return;

    const criadas: string[] = [];
    let cancelado = false;

    const carregar = async (tipo: 'CHECKIN' | 'CHECKOUT', existe?: boolean) => {
      if (!existe) return;
      try {
        const url = await checkService.getPhotoUrl(subject.checkId!, tipo);
        if (cancelado) {
          URL.revokeObjectURL(url);
          return;
        }
        criadas.push(url);
        setFotos((atuais) => ({
          ...atuais,
          [tipo === 'CHECKIN' ? 'entrada' : 'saida']: url,
        }));
      } catch {
        setErroFoto(true);
      }
    };

    carregar('CHECKIN', subject.hasCheckinPhoto);
    carregar('CHECKOUT', subject.hasCheckoutPhoto);

    // Sem revogar, cada abertura deixa blobs presos na memória da aba.
    return () => {
      cancelado = true;
      criadas.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [subject.checkId, subject.hasCheckinPhoto, subject.hasCheckoutPhoto]);

  const Campo: React.FC<{ rotulo: string; valor?: string | null }> = ({ rotulo, valor }) => (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{rotulo}</p>
      <p className="text-sm text-gray-900 break-words">{valor || '—'}</p>
    </div>
  );

  const Acao: React.FC<{
    titulo: string;
    horario?: string;
    manual?: boolean;
    ip?: string | null;
    foto?: string;
    temFoto?: boolean;
  }> = ({ titulo, horario, manual, ip, foto, temFoto }) => (
    <div className="flex-1 min-w-0 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700">{titulo}</span>
        {horario &&
          (manual ? (
            <span className="text-[10px] text-amber-700 flex items-center gap-1">
              <Hand size={11} /> admin
            </span>
          ) : (
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Smartphone size={11} /> celular
            </span>
          ))}
      </div>

      <div className="p-3 space-y-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Horário</p>
          <p className="text-sm text-gray-900">{formatar(horario) || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">IP de origem</p>
          <p className="text-sm text-gray-900 font-mono break-all">
            {ip || (manual ? 'não se aplica' : '—')}
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
          {foto ? (
            <img src={foto} alt={`Foto de ${titulo}`} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400 px-2">
              <ImageOff size={20} className="mx-auto mb-1 opacity-60" />
              <p className="text-[10px]">
                {/* Explica a ausência em vez de deixar parecer arquivo perdido. */}
                {manual ? 'marcado pelo admin' : temFoto ? 'carregando...' : 'sem foto'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 sticky top-0 bg-white">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{subject.name}</h3>
            <p className="text-xs text-gray-500 truncate">
              {subject.ra ? `RA ${subject.ra}` : 'sem RA'}
              {subject.subEventTitle && ` · ${subject.subEventTitle}`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Campo rotulo="E-mail" valor={subject.email} />
            <Campo rotulo="Turma" valor={subject.classGroupName} />
            <Campo rotulo="Curso" valor={subject.courseName} />
            <Campo rotulo="Presença" valor={subject.presence} />
          </div>

          {erroFoto && (
            <p className="text-xs text-amber-700">
              Alguma foto não pôde ser carregada. O restante das informações está completo.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Acao
              titulo="Entrada"
              horario={subject.checkinTime}
              manual={subject.checkinManual}
              ip={subject.checkinIp}
              foto={fotos.entrada}
              temFoto={subject.hasCheckinPhoto}
            />
            <Acao
              titulo="Saída"
              horario={subject.checkoutTime}
              manual={subject.checkoutManual}
              ip={subject.checkoutIp}
              foto={fotos.saida}
              temFoto={subject.hasCheckoutPhoto}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailsModal;
