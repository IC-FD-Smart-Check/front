import { useState, useRef, useCallback, useEffect } from 'react';

interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    message: '',
    type: 'success',
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning', duration = 3000) => {
    // Limpa timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ isVisible: true, message, type });

    timeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
      timeoutRef.current = null;
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { toast, showToast, hideToast };
};
