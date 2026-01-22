import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle, History, QrCode, Calendar, MapPin, Clock } from 'lucide-react';
import Button from '@/components/common/Button';
import Toast from '@/components/common/Toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { useToast } from '@/hooks/useToast';
import { checkService } from '@/services';
import type { CheckRecord, CheckInfoResponse } from '@/types';

interface StudentCheckProps {
  onCheckComplete?: (eventInfo: CheckInfoResponse, isCheckOut: boolean) => void;
}

const StudentCheck: React.FC<StudentCheckProps> = ({ onCheckComplete }) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const startCameraTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qrCodeRegionId = 'qr-reader';
  const [activeTab, setActiveTab] = useState<'checkin' | 'history'>('checkin');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shouldStartCamera, setShouldStartCamera] = useState(false);
  const [eventInfo, setEventInfo] = useState<CheckInfoResponse | null>(null);
  const [scannedQRCode, setScannedQRCode] = useState<string>(''); // Armazena o QR code original
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [myCheckRecords, setMyCheckRecords] = useState<CheckRecord[]>([]);
  const [historyStats, setHistoryStats] = useState({
    totalEvents: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
  });
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (shouldStartCamera && cameraOpen) {
      startCamera();
    }
  }, [shouldStartCamera, cameraOpen]);

  useEffect(() => {
    return () => {
      stopScanning();
      if (startCameraTimeoutRef.current) {
        clearTimeout(startCameraTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadCheckHistory();
    }
  }, [activeTab]);

  const loadCheckHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await checkService.getCheckHistory();
      const records = Array.isArray(data) ? data : (data.records || []);
      setMyCheckRecords(records);
      
      // Calcular estatísticas dos registros
      const uniqueEvents = new Set(records.map(r => r.eventId)).size;
      const checkIns = records.filter(r => r.checkinTime).length;
      const checkOuts = records.filter(r => r.checkoutTime).length;
      
      setHistoryStats({
        totalEvents: data.totalEvents || uniqueEvents,
        totalCheckIns: data.totalCheckIns || checkIns,
        totalCheckOuts: data.totalCheckOuts || checkOuts,
      });
    } catch (err) {
      showToast('Erro ao carregar histórico', 'error');
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };



  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        const isScanning = html5QrCodeRef.current.isScanning;
        if (isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const element = document.getElementById(qrCodeRegionId);
      if (!element) {
        console.error('Elemento não encontrado, tentando novamente...');
        startCameraTimeoutRef.current = setTimeout(startCamera, 100);
        return;
      }
      
      // Limpa timeout se o elemento foi encontrado
      if (startCameraTimeoutRef.current) {
        clearTimeout(startCameraTimeoutRef.current);
        startCameraTimeoutRef.current = null;
      }

      if (html5QrCodeRef.current) {
        await stopScanning();
      }

      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      html5QrCodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleQRCodeScanned(decodedText);
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
      } catch (err) {
        await html5QrCode.start(
          { facingMode: "user" },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
      }

      showToast('Câmera aberta! Aponte para o QR code', 'success');
      setShouldStartCamera(false);
    } catch (err: any) {
      let errorMessage = 'Erro ao acessar a câmera.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permissão de câmera negada. Habilite nas configurações do navegador.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Câmera não suporta as configurações solicitadas.';
      } else if (err.message?.includes('not found')) {
        errorMessage = 'Erro ao acessar elemento da câmera. Tente novamente.';
      }
      
      showToast(errorMessage, 'error');
      console.error('Erro ao abrir câmera:', err);
      setCameraOpen(false);
      setShouldStartCamera(false);
    }
  };

  const openCamera = () => {
    setCameraOpen(true);
    setShouldStartCamera(true);
  };

  const closeCamera = async () => {
    await stopScanning();
    setCameraOpen(false);
    setShouldStartCamera(false);
    setEventInfo(null);
  };

  const handleQRCodeScanned = async (qrData: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);

    try {
      // LIMPA A CÂMERA PRIMEIRO
      if (html5QrCodeRef.current) {
        const isScanning = html5QrCodeRef.current.isScanning;
        if (isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }

      // Valida o QR code
      const checkInfo = await checkService.validateQRCode({ qrCode: qrData });

      // Fecha a view da câmera
      setCameraOpen(false);
      setShouldStartCamera(false);
      
      // Salva o QR code original e mostra os dados do evento
      setScannedQRCode(qrData);
      setEventInfo(checkInfo);
      showToast('QR Code validado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao validar QR Code', 'error');
      console.error('Erro ao validar QR Code:', err);
      
      // Volta pra tela inicial em caso de erro
      setCameraOpen(false);
      setShouldStartCamera(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização indisponível';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo esgotado ao obter localização';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!eventInfo || !scannedQRCode) return;

    setIsProcessing(true);
    try {
      const location = await getCurrentLocation();
      const result = await checkService.checkIn({
        qrCode: scannedQRCode,
        type: 'CHECKIN',
        latitude: location.latitude,
        longitude: location.longitude,
      });
      showToast(result.message, 'success');
      onCheckComplete?.(eventInfo, false);
      resetState();
    } catch (err: any) {
      showToast(err.message || 'Erro ao realizar check-in', 'error');
      console.error('Erro ao fazer check-in:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!eventInfo || !scannedQRCode) return;

    setIsProcessing(true);
    try {
      const location = await getCurrentLocation();
      const result = await checkService.checkIn({
        qrCode: scannedQRCode,
        type: 'CHECKOUT',
        latitude: location.latitude,
        longitude: location.longitude,
      });
      showToast(result.message, 'success');
      onCheckComplete?.(eventInfo, true);
      resetState();
    } catch (err: any) {
      showToast(err.message || 'Erro ao realizar check-out', 'error');
      console.error('Erro ao fazer check-out:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = async () => {
    await stopScanning();
    setCameraOpen(false);
    setShouldStartCamera(false);
    setEventInfo(null);
    setScannedQRCode('');
  };

  // Renderizar histórico
  if (activeTab === 'history') {
    return (
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('checkin')}
              className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-gray-600 hover:bg-gray-50"
            >
              <QrCode size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Fazer Check-in</span>
              <span className="sm:hidden">Check-in</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 bg-[#B7294A] text-white"
            >
              <History size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Meu Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total de Eventos</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2">{historyStats.totalEvents}</p>
              </div>
              <CheckCircle size={32} className="text-blue-500 opacity-20 sm:w-10 sm:h-10" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Check-ins</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {historyStats.totalCheckIns}
                </p>
              </div>
              <CheckCircle size={40} className="text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Check-outs</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {historyStats.totalCheckOuts}
                </p>
              </div>
              <CheckCircle size={40} className="text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Meus Check-ins</h3>
            <p className="text-sm text-gray-600 mt-1">
              {myCheckRecords.length} evento{myCheckRecords.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {myCheckRecords.length > 0 ? (
              myCheckRecords.map((record) => (
                <div key={record.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-medium text-[#B7294A] bg-[#B7294A]/10 px-2 py-1 rounded">
                          {record.eventTitle}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900">{record.subEventTitle}</h4>
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <Calendar size={16} />
                        <span className="text-sm">{new Date(record.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <p className="text-xs text-green-700 font-medium">Check-in</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-green-600" />
                        <span className="text-sm font-semibold text-green-900">
                          {record.checkinTime ? new Date(record.checkinTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className={`rounded-lg p-3 border ${
                      record.checkoutTime 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          record.checkoutTime ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <p className={`text-xs font-medium ${
                          record.checkoutTime ? 'text-red-700' : 'text-gray-600'
                        }`}>
                          Check-out
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className={record.checkoutTime ? 'text-red-600' : 'text-gray-400'} />
                        <span className={`text-sm font-semibold ${
                          record.checkoutTime ? 'text-red-900' : 'text-gray-500'
                        }`}>
                          {record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <History size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Você ainda não fez check-in em nenhum evento</p>
                <Button
                  onClick={() => setActiveTab('checkin')}
                  className="mt-4"
                >
                  Fazer Check-in
                </Button>
              </div>
            )}
          </div>
        </div>

        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          type={toast.type}
          onClose={hideToast}
        />
      </div>
    );
  }

  // Tela de informações do evento
  if (eventInfo && !cameraOpen) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('checkin');
                resetState();
              }}
              className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 bg-[#B7294A] text-white"
            >
              <QrCode size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Fazer Check-in</span>
              <span className="sm:hidden">Check-in</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                resetState();
              }}
              className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-gray-600 hover:bg-gray-50"
            >
              <History size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Meu Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] px-4 sm:px-6 py-6 sm:py-8 text-white">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <CheckCircle size={24} className="sm:w-8 sm:h-8" />
              <h2 className="text-xl sm:text-2xl font-bold">Evento Encontrado</h2>
            </div>
            <p className="text-white/90">Confirme sua presença no evento</p>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <div className="pb-3 sm:pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs sm:text-sm font-medium text-[#B7294A] bg-[#B7294A]/10 px-3 py-1 rounded">
                    {eventInfo.eventTitle}
                  </span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Subevento</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{eventInfo.subEventTitle}</p>
                  {eventInfo.subEventDescription && (
                    <p className="text-sm text-gray-600 mt-1">{eventInfo.subEventDescription}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600">Início</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {new Date(eventInfo.startDate).toLocaleString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600">Término</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {new Date(eventInfo.endDate).toLocaleString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-600">Local</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{eventInfo.locationDescription}</p>
              </div>

              {!eventInfo.canPerformAction && eventInfo.validationMessage && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">{eventInfo.validationMessage}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={resetState}
                variant="secondary"
                fullWidth
                disabled={isProcessing}
              >
                Voltar
              </Button>
              {eventInfo.actionType === 'CHECKIN' ? (
                <Button
                  onClick={handleCheckIn}
                  fullWidth
                  disabled={isProcessing || !eventInfo.canPerformAction}
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Check-in'}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  variant="outline"
                  fullWidth
                  disabled={isProcessing || !eventInfo.canPerformAction}
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Check-out'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          type={toast.type}
          onClose={hideToast}
        />
      </div>
    );
  }

  // Tela da câmera
  if (cameraOpen) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('checkin')}
              className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 bg-[#B7294A] text-white"
            >
              <QrCode size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Fazer Check-in</span>
              <span className="sm:hidden">Check-in</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                closeCamera();
              }}
              className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-gray-600 hover:bg-gray-50"
            >
              <History size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Meu Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-visible">
          <div className="bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] px-4 sm:px-6 py-4 sm:py-6 text-white flex justify-between items-center gap-3 sm:gap-4 relative z-10 rounded-t-2xl">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Escanear QR Code</h2>
              <p className="text-xs sm:text-sm md:text-base text-white/90">Aponte a câmera para o código</p>
            </div>
            <button
              onClick={closeCamera}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
              disabled={isProcessing}
              aria-label="Fechar câmera"
            >
              <X size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="relative bg-black flex items-center justify-center overflow-hidden rounded-b-2xl" style={{ minHeight: '300px', height: '60vh', maxHeight: '500px' }}>
            <div id={qrCodeRegionId} style={{ width: '100%' }} />
            <LoadingOverlay
              isVisible={isProcessing || shouldStartCamera}
              message={shouldStartCamera ? 'Iniciando câmera...' : 'Validando QR Code...'}
            />
          </div>

          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-center rounded-b-2xl">
            <p className="text-gray-600 text-xs sm:text-sm">
              {isProcessing ? 'Processando...' : 'Posicione o código na câmera'}
            </p>
          </div>
        </div>

        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          type={toast.type}
          onClose={hideToast}
        />
      </div>
    );
  }

  // Tela inicial
  return (
    <div className="max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('checkin')}
            className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 bg-[#B7294A] text-white"
          >
            <QrCode size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Fazer Check-in</span>
            <span className="sm:hidden">Check-in</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-gray-600 hover:bg-gray-50"
          >
            <History size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Meu Histórico</span>
            <span className="sm:hidden">Histórico</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] px-4 sm:px-6 py-8 sm:py-12 text-white text-center">
          <Camera size={40} className="mx-auto mb-4 sm:w-12 sm:h-12" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Check-in de Eventos</h2>
          <p className="text-sm sm:text-base text-white/90">Escaneie o QR code do evento para fazer check-in</p>
        </div>

        <div className="p-6 sm:p-8 md:p-12 flex flex-col items-center gap-4 sm:gap-6">
          <div className="text-center mb-2 sm:mb-4">
            <p className="text-sm sm:text-base text-gray-600 mb-2">Clique no botão abaixo para abrir a câmera</p>
            <p className="text-xs sm:text-sm text-gray-500">Você precisará permitir acesso à câmera</p>
          </div>

          <Button
            onClick={openCamera}
            fullWidth
            className="py-3 sm:py-4 text-base sm:text-lg"
          >
            Abrir Câmera
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentCheck;