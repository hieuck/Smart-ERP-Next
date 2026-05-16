import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: CardProps) => (
  <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }: CardProps) => (
  <h3 className={`text-lg font-bold text-gray-900 dark:text-white ${className}`}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }: CardProps) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);