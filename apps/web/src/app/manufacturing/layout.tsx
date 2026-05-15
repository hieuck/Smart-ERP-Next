'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/manufacturing/bom', key: 'bom' },
  { href: '/manufacturing/production-orders', key: 'productionOrders' },
  { href: '/manufacturing/mrp', key: 'mrp' },
];

export default function ManufacturingLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const pathname = usePathname();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('manufacturing.title')}</h1>
      <nav className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              pathname === tab.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            {t(`manufacturing.${tab.key}`)}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}