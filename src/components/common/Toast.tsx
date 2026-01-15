import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-500',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500',
    },
  };

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[type];

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div
        className={`${bgColor} ${borderColor} ${textColor} border rounded-lg shadow-lg p-4 pr-12 max-w-md min-w-[300px]`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
          <p className="text-sm font-medium flex-1">{message}</p>
          <button
            onClick={onClose}
            className={`${textColor} hover:opacity-70 transition-opacity absolute top-3 right-3`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
