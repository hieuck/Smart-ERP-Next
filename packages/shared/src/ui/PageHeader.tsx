import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  actions?: React.ReactNode;
}

const bgMap: Record<string, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/30',
  green: 'bg-green-100 dark:bg-green-900/30',
  purple: 'bg-purple-100 dark:bg-purple-900/30',
  orange: 'bg-orange-100 dark:bg-orange-900/30',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30',
  red: 'bg-red-100 dark:bg-red-900/30',
  gray: 'bg-gray-100 dark:bg-gray-700',
};

const textMap: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  red: 'text-red-600 dark:text-red-400',
  gray: 'text-gray-600 dark:text-gray-400',
};

export const PageHeader = ({ title, description, icon, iconColor = 'blue', actions }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`p-2.5 rounded-lg ${bgMap[iconColor] || bgMap.blue}`}>
            <div className={`w-5 h-5 ${textMap[iconColor] || textMap.blue}`}>{icon}</div>
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
