import React from 'react';
import { CalendarCheck, LogIn, LogOut, type LucideIcon } from 'lucide-react';

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
      text: 'text-blue-700',
      value: 'text-blue-900',
      icon: 'text-blue-500',
    },
    green: {
      bg: 'from-green-50 to-green-100',
      border: 'border-green-200',
      text: 'text-green-700',
      value: 'text-green-900',
      icon: 'text-green-500',
    },
    purple: {
      bg: 'from-purple-50 to-purple-100',
      border: 'border-purple-200',
      text: 'text-purple-700',
      value: 'text-purple-900',
      icon: 'text-purple-500',
    },
  };

  const color = colors[colorClass as keyof typeof colors];

  return (
    <div className={`bg-gradient-to-br ${color.bg} rounded-xl p-3 sm:p-6 border ${color.border} min-w-0`}>
      {/* No celular os três cards ficam lado a lado, então o ícone vai para cima e o texto encolhe */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0 order-2 sm:order-1">
          <p className={`text-[11px] leading-tight sm:text-sm ${color.text} font-medium`}>{label}</p>
          <p className={`text-xl sm:text-3xl font-bold ${color.value} mt-0.5 sm:mt-2`}>{value}</p>
        </div>
        <Icon size={20} className={`${color.icon} opacity-60 sm:opacity-20 sm:w-10 sm:h-10 order-1 sm:order-2`} />
      </div>
    </div>
  );
};

interface CheckStatsProps {
  totalEvents: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  /** Rótulo do primeiro card (o admin usa a mesma tela para contar registros) */
  eventsLabel?: string;
}

const CheckStats: React.FC<CheckStatsProps> = ({
  totalEvents,
  totalCheckIns,
  totalCheckOuts,
  eventsLabel = 'Eventos',
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <StatCard
        label={eventsLabel}
        value={totalEvents}
        icon={CalendarCheck}
        colorClass="blue"
      />
      <StatCard
        label="Check-ins"
        value={totalCheckIns}
        icon={LogIn}
        colorClass="green"
      />
      <StatCard
        label="Check-outs"
        value={totalCheckOuts}
        icon={LogOut}
        colorClass="purple"
      />
    </div>
  );
};

export default CheckStats;
