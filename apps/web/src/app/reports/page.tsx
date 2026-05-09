'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { LayoutDashboard, BarChart3, TrendingUp, Building2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface UserRegistration {
  date: string;
  count: number;
}

interface TenantStat {
  id: string;
  name: string;
  slug: string;
  userCount: number;
  createdAt: string;
}

export default function ReportsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [userRegistrations, setUserRegistrations] = useState<UserRegistration[]>([]);
  const [tenantStats, setTenantStats] = useState<TenantStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [regRes, tenantRes] = await Promise.all([
        apiClient.get('/reports/user-registrations?days=14'),
        apiClient.get('/reports/tenant-stats'),
      ]);
      setUserRegistrations(regRes.data);
      setTenantStats(tenantRes.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
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
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Smart ERP Next
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/reports')}
              className="text-sm font-medium text-blue-600"
            >
              Reports
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                router.push('/login');
              }}
              className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400">User registrations and tenant insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Registrations Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Registrations (Last 14 days)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userRegistrations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="New users" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tenant User Count Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Users per Tenant
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tenantStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="userCount" fill="#10b981" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tenant Details Table */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tenant Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tenantStats.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{t.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{t.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{t.userCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
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