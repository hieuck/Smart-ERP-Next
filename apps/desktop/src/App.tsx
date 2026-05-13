// Smart ERP Desktop - Main App
import React, { useState, useEffect } from 'react';
import { Sidebar } from '@smart-erp/ui';
import type { NavItem } from '@smart-erp/ui';
import { Dashboard } from './components/Dashboard';
import { CRMScreen } from './components/CRMScreen';
import { POSScreen } from './components/POSScreen';
import { AccountingScreen } from './components/AccountingScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { syncService } from './lib/sync-service';

type Screen = 'dashboard' | 'pos' | 'crm' | 'products' | 'orders' | 'inventory' | 'accounting';

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', href: '/dashboard' },
  { key: 'pos', label: 'POS', href: '/pos' },
  { key: 'orders', label: 'Đơn hàng', href: '/orders' },
  { key: 'products', label: 'Sản phẩm', href: '/products' },
  { key: 'inventory', label: 'Kho hàng', href: '/inventory' },
  { key: 'crm', label: 'CRM', href: '/crm' },
  { key: 'accounting', label: 'Kế toán', href: '/accounting' },
];

export default function DesktopApp() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavigate = (item: NavItem) => {
    const key = item.key as Screen;
    setActiveScreen(key);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'crm':
        return <CRMScreen />;
      case 'pos':
        return <POSScreen />;
      case 'accounting':
        return <AccountingScreen />;
      case 'products':
        return <div className="p-8 text-gray-500">Sản phẩm</div>;
      case 'orders':
        return <div className="p-8 text-gray-500">Đơn hàng</div>;
      case 'inventory':
        return <InventoryScreen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        items={NAV_ITEMS}
        activeKey={activeScreen}
        onNavigate={handleNavigate}
        header={
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">Smart ERP</h1>
            <div className={`text-xs mt-1 ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
              {isOnline ? '● Online' : '○ Offline'}
            </div>
          </div>
        }
        footer={
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">v0.3.0 - Desktop</p>
          </div>
        }
      />
      <main className="flex-1 overflow-auto">
        {renderScreen()}
      </main>
    </div>
  );
}