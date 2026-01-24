import React, { useEffect, useState } from 'react';
import { QRCodeResponse } from '@/types';
import { qrCodeService } from '@/services';
import Button from './Button';
import QRCode from 'react-qr-code';

interface QRCodeManagerProps {
  isOpen: boolean;
  subEventId: string;
  subEventTitle: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const QRCodeManager: React.FC<QRCodeManagerProps> = ({
  isOpen,
  subEventId,
  subEventTitle,
  onClose,
  onSuccess,
  onError,
}) => {
  const [qrCodes, setQrCodes] = useState<QRCodeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && subEventId) {
      loadQRCodes();
    }
  }, [isOpen, subEventId]);

  const loadQRCodes = async () => {
    try {
      setLoading(true);
      const data = await qrCodeService.listQRCodesBySubEvent(subEventId);
      // Ordenar por data de criação (mais recente primeiro)
      setQrCodes(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao carregar QR codes';
      onError?.(errorMessage);
      console.error('Erro ao carregar QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCode = async () => {
    try {
      setGenerating(true);
      await qrCodeService.generateQRCode(subEventId);
      await loadQRCodes(); // Recarrega a lista
      onSuccess?.('QR Code gerado com sucesso! Os QR codes anteriores foram desativados automaticamente.');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao gerar QR code';
      onError?.(errorMessage);
      console.error('Erro ao gerar QR code:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleActivate = async (qrCodeId: string) => {
    try {
      await qrCodeService.activateQRCode(qrCodeId);
      await loadQRCodes(); // Recarrega a lista
      onSuccess?.('QR Code ativado com sucesso! Os outros QR codes foram desativados.');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao ativar QR code';
      onError?.(errorMessage);
      console.error('Erro ao ativar QR code:', err);
    }
  };

  const handleDeactivate = async (qrCodeId: string) => {
    try {
      await qrCodeService.deactivateQRCode(qrCodeId);
      await loadQRCodes(); // Recarrega a lista
      onSuccess?.('QR Code desativado com sucesso!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao desativar QR code';
      onError?.(errorMessage);
      console.error('Erro ao desativar QR code:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const downloadQRCode = (codeData: string) => {
    const svg = document.getElementById(`qrcode-${codeData}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qrcode-${subEventTitle.replace(/[^a-z0-9]/gi, '_')}-${codeData.substring(0, 8)}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!isOpen) return null;

  const activeQRCode = qrCodes.find(qr => qr.isActive);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar QR Codes</h2>
            <p className="text-sm text-gray-600 mt-2">{subEventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Carregando...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Botão de gerar novo QR Code */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">Gerar Novo QR Code</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Ao gerar um novo QR code, todos os anteriores serão desativados automaticamente.
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateQRCode}
                    disabled={generating}
                    className="whitespace-nowrap"
                  >
                    {generating ? 'Gerando...' : '+ Gerar Novo'}
                  </Button>
                </div>
              </div>

              {/* QR Code Ativo */}
              {activeQRCode && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 border-2 border-green-400 shadow-lg">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-green-900 text-xl">QR Code Ativo</h3>
                      <p className="text-sm text-green-700 mt-1">Gerado em {formatDate(activeQRCode.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* QR Code visual */}
                    <div className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200">
                      <QRCode
                        id={`qrcode-${activeQRCode.codeData}`}
                        value={activeQRCode.codeData}
                        size={220}
                        level="H"
                      />
                    </div>

                    {/* Informações e ações */}
                    <div className="flex-1 space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Código</p>
                        <p className="text-sm font-mono text-gray-800 break-all leading-relaxed">
                          {activeQRCode.codeData}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => downloadQRCode(activeQRCode.codeData)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Baixar PNG
                        </button>
                        <button
                          onClick={() => handleDeactivate(activeQRCode.id)}
                          className="px-5 py-2.5 bg-white text-red-600 border-2 border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-semibold"
                        >
                          Desativar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Codes Inativos */}
              {qrCodes.filter(qr => !qr.isActive).length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    QR Codes Anteriores ({qrCodes.filter(qr => !qr.isActive).length})
                  </h3>
                  <div className="space-y-4">
                    {qrCodes.filter(qr => !qr.isActive).map((qrCode) => (
                      <div key={qrCode.id} className="bg-gray-50 rounded-lg p-5 border border-gray-300 hover:border-gray-400 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-3 py-1 bg-gray-300 text-gray-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                                Inativo
                              </span>
                              <p className="text-sm text-gray-600">Gerado em {formatDate(qrCode.createdAt)}</p>
                            </div>
                            <p className="text-sm font-mono text-gray-700 break-all bg-white px-3 py-2 rounded border border-gray-200">
                              {qrCode.codeData}
                            </p>
                          </div>
                          <button
                            onClick={() => handleActivate(qrCode.id)}
                            className="px-5 py-2.5 bg-[#B7294A] text-white rounded-lg hover:bg-[#9a2139] transition-colors text-sm font-semibold whitespace-nowrap shadow-md hover:shadow-lg"
                          >
                            Reativar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado vazio */}
              {qrCodes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-4">Nenhum QR code gerado para este subevento</p>
                  <Button onClick={handleGenerateQRCode} disabled={generating}>
                    {generating ? 'Gerando...' : 'Gerar Primeiro QR Code'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 px-8 py-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeManager;
