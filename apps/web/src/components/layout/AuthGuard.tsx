'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppLayout from './AppLayout';
import { syncService } from '@smart-erp/sync';
import { closeSocket, initSocket } from '@/lib/socket';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSync, setPendingSync] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }

    let parsedUser;
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }
    setUser(parsedUser);
    setReady(true);

    // Init WebSocket with both userId and tenantId
    initSocket(parsedUser.id, parsedUser.tenantId);

    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncService.processQueue().catch(console.error);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      closeSocket();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax';
    closeSocket();
    router.replace('/login');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{t('common.loading', 'Loading...')}</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      user={user}
      isOnline={isOnline}
      pendingSync={pendingSync}
      onLogout={handleLogout}
    >
      {children}
    </AppLayout>
  );
}

