import React from 'react';
import { CheckCircle, User, XCircle, LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClass }) => {
  const colors = {
    blue: {
      bg: 'from-blue-50 to-blue-100',
      border: 'border-blue-200',
      text: 'text-blue-600',
      value: 'text-blue-900',
      icon: 'text-blue-500',
    },
    green: {
      bg: 'from-green-50 to-green-100',
      border: 'border-green-200',
      text: 'text-green-600',
      value: 'text-green-900',
      icon: 'text-green-500',
    },
    purple: {
      bg: 'from-purple-50 to-purple-100',
      border: 'border-purple-200',
      text: 'text-purple-600',
      value: 'text-purple-900',
      icon: 'text-purple-500',
    },
  };

  const color = colors[colorClass as keyof typeof colors];

  return (
    <div className={`bg-gradient-to-br ${color.bg} rounded-lg p-4 sm:p-6 border ${color.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs sm:text-sm ${color.text} font-medium`}>{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${color.value} mt-1 sm:mt-2`}>{value}</p>
        </div>
        <Icon size={32} className={`${color.icon} opacity-20 sm:w-10 sm:h-10`} />
      </div>
    </div>
  );
};

interface CheckStatsProps {
  totalEvents: number;
  totalCheckIns: number;
  totalCheckOuts: number;
}

const CheckStats: React.FC<CheckStatsProps> = ({ totalEvents, totalCheckIns, totalCheckOuts }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Total de Eventos"
        value={totalEvents}
        icon={CheckCircle}
        colorClass="blue"
      />
      <StatCard
        label="Check-ins"
        value={totalCheckIns}
        icon={CheckCircle}
        colorClass="green"
      />
      <StatCard
        label="Check-outs"
        value={totalCheckOuts}
        icon={CheckCircle}
        colorClass="purple"
      />
    </div>
  );
};

export default CheckStats;