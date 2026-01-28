import React from 'react';
import { QrCode, History } from 'lucide-react';

interface CheckTabsProps {
  activeTab: 'checkin' | 'history';
  onTabChange: (tab: 'checkin' | 'history') => void;
}

const CheckTabs: React.FC<CheckTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => onTabChange('checkin')}
          className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            activeTab === 'checkin'
              ? 'bg-[#B7294A] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <QrCode size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Fazer Check-in</span>
          <span className="sm:hidden">Check-in</span>
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-center text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            activeTab === 'history'
              ? 'bg-[#B7294A] text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <History size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Meu Histórico</span>
          <span className="sm:hidden">Histórico</span>
        </button>
      </div>
    </div>
  );
};

export default CheckTabs;