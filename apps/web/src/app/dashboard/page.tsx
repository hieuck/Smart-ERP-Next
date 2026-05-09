
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/lib/api-client';
import { initSocket, closeSocket } from '@/lib/socket';
import { LayoutDashboard, Users, Settings, LogOut, Bell, Wifi, WifiOff } from 'lucide-react';
import { syncService } from '@smart-erp/sync';

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Array<{ message: string; timestamp: string }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    fetchUsers();

    // Initialize WebSocket connection
    const parsedUser = JSON.parse(storedUser);
    const socket = initSocket(parsedUser.id);
    socket.on('user.registered', (data) => {
      setNotifications(prev => [
        { message: `New user registered: ${data.email}`, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9)
      ]);
      // Optionally refresh user list
      fetchUsers();
    });

    return () => {
      closeSocket();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll();
      const userData = response.data;
      setUsers(userData);
      // Cache offline
      await syncService.syncUsers(userData);
    } catch (err) {
      console.error('Failed to fetch users, loading offline cache:', err);
      const offlineUsers = await syncService.getOfflineUsers();
      setUsers(offlineUsers);
    } finally {
      setLoading(false);
    }
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncService.processQueue();
      fetchUsers();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Smart ERP Next
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div>{user?.name || user?.email}</div>
              <div className="text-xs text-gray-400">Role: {user?.role || 'user'} | Tenant: {user?.tenantId?.slice(0, 8)}...</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('users')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-gray-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('users')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tenant ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{u.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{u.tenantId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
