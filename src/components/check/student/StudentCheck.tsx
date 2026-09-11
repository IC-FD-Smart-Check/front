import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { checkService } from '@/services';
import Toast from '@/components/common/Toast';
import CheckTabs from './CheckTabs';
import QRScanner from './QRScanner';
import EventConfirmation from './EventConfirmation';
import CheckHistory from './CheckHistory';
import CheckinInitial from './CheckinInitial';
import SelfieCapture from './SelfieCapture';
import type { CheckResponse, CheckInfoResponse } from '@/types';

interface StudentCheckProps {
  onCheckComplete?: (eventInfo: CheckInfoResponse, isCheckOut: boolean) => void;
}

type ViewState = 'initial' | 'scanner' | 'confirmation' | 'photo';

const StudentCheck: React.FC<StudentCheckProps> = ({ onCheckComplete }) => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'history'>('checkin');
  const [view, setView] = useState<ViewState>('initial');
  const [eventInfo, setEventInfo] = useState<CheckInfoResponse | null>(null);
  const [scannedQRCode, setScannedQRCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkRecords, setCheckRecords] = useState<CheckResponse[]>([]);
  const [historyStats, setHistoryStats] = useState({
    totalEvents: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
  });
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (activeTab === 'history') {
      loadCheckHistory();
    }
  }, [activeTab]);

  const loadCheckHistory = async () => {
    try {
      const records = await checkService.getHistory();
      setCheckRecords(records);

      const uniqueEvents = new Set(records.map((r) => r.eventId)).size;
      const checkIns = records.filter((r) => r.checkinTime).length;
      const checkOuts = records.filter((r) => r.checkoutTime).length;

      setHistoryStats({
        totalEvents: uniqueEvents,
        totalCheckIns: checkIns,
        totalCheckOuts: checkOuts,
      });
    } catch (err) {
      showToast('Erro ao carregar histórico', 'error');
    }
  };

  const handleQRCodeScanned = async (qrData: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const checkInfo = await checkService.getCheckInfo(qrData);
      setScannedQRCode(qrData);
      setEventInfo(checkInfo);
      setView('confirmation');
      showToast('QR Code validado com sucesso!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao validar QR Code';
      showToast(errorMessage, 'error');
      setView('initial');
    } finally {
      setIsProcessing(false);
    }
  };

  // Check-in e checkout exigem foto tirada na hora.
  const handleConfirm = () => {
    if (!eventInfo) return;
    setView('photo');
  };

  const handlePerformCheck = async (photoBase64?: string) => {
    if (!eventInfo || !scannedQRCode) return;

    setIsProcessing(true);
    try {
      const result = await checkService.performCheck(
        scannedQRCode,
        eventInfo.actionType as 'CHECKIN' | 'CHECKOUT',
        photoBase64
      );

      showToast(result.message, 'success');
      onCheckComplete?.(eventInfo, eventInfo.actionType === 'CHECKOUT');
      resetState();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao realizar ação';

      if (errorMessage.includes('Permissão de localização')) {
        showToast(errorMessage, 'error');
      } else if (errorMessage.includes('muito longe')) {
        showToast(errorMessage, 'error');
      } else if (errorMessage.includes('expirada')) {
        showToast(errorMessage, 'error');
      } else if (errorMessage.includes('assinatura')) {
        showToast('Erro de segurança. Tente novamente.', 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setView('initial');
    setEventInfo(null);
    setScannedQRCode('');
  };

  const handleTabChange = (tab: 'checkin' | 'history') => {
    setActiveTab(tab);
    resetState();
  };

  return (
    <>
      <CheckTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'history' ? (
        <CheckHistory
          records={checkRecords}
          stats={historyStats}
          onBackToCheckin={() => setActiveTab('checkin')}
        />
      ) : (
        <>
          {view === 'initial' && <CheckinInitial onOpenCamera={() => setView('scanner')} />}

          {view === 'scanner' && (
            <QRScanner
              onScan={handleQRCodeScanned}
              onClose={() => setView('initial')}
              isProcessing={isProcessing}
              onError={(msg) => showToast(msg, 'error')}
            />
          )}

          {view === 'confirmation' && eventInfo && (
            <EventConfirmation
              eventInfo={eventInfo}
              onConfirm={handleConfirm}
              onCancel={resetState}
              isProcessing={isProcessing}
            />
          )}

          {view === 'photo' && eventInfo && (
            <SelfieCapture
              isCheckout={eventInfo.actionType === 'CHECKOUT'}
              onCapture={handlePerformCheck}
              // Voltar para a confirmação, e não para o início: o QR já foi
              // lido e obrigar a escanear de novo seria punir quem desistiu
              // da foto por um segundo.
              onCancel={() => setView('confirmation')}
              isProcessing={isProcessing}
            />
          )}
        </>
      )}

      <Toast message={toast.message} isVisible={toast.isVisible} type={toast.type} onClose={hideToast} />
    </>
  );
};

export default StudentCheck;