import React from 'react';
import { useTranslation } from 'react-i18next';

interface WidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export function AIInsightWidget({ title, value, subtitle, trend, color = 'blue' }: WidgetProps) {
  const { t } = useTranslation('common');
  const colorMap: Record<string, string> = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500',
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${colorMap[color] ?? colorMap.blue}`}>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}