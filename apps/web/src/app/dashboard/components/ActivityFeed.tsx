'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { Activity, Package, ShoppingBag, Users, Truck, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
  user: { name: string };
}

const actionIcons: Record<string, any> = {
  created: Package,
  updated: Activity,
  deleted: AlertCircle,
  approved: ShoppingBag,
  rejected: AlertCircle,
  stock_adjusted: Truck,
};

const getIcon = (action: string) => {
  const Icon = actionIcons[action] || Activity;
  return <Icon className="w-4 h-4" />;
};

export function ActivityFeed() {
  const { t, i18n } = useTranslation('common');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await apiClient.get('/activity/recent');
      setActivities(res.data.items);
    } catch (error) {
      console.error('Failed to fetch activities', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  const locale = i18n.language === 'vi' ? vi : enUS;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {t('dashboard.recentActivities')}
        </h2>
        <Activity className="w-4 h-4 text-gray-400" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          {t('dashboard.noActivities')}
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                {getIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{activity.user?.name }</span>
                  {' '}
                  <span className="text-gray-500 dark:text-gray-400">
                    {t(`activity.${activity.action}`, { defaultValue: activity.action })}
                  </span>
                  {' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {t(`activity.entityTypes.${activity.entityType}`, { defaultValue: activity.entityType })}
                  </span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


