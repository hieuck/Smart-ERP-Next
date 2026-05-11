'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, X, ShoppingBag, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface Notification {
  id: string;
  type: 'order.created' | 'order.status_changed' | 'stock.low' | 'order.payment_received' | 'system.alert';
  message: string;
  timestamp: Date;
  read: boolean;
}

const TYPE_CONFIG = {
  'order.created': { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'order.status_changed': { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  'stock.low': { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  'order.payment_received': { icon: <DollarSign className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  'system.alert': { icon: <Package className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const addNotification = (type: Notification['type'], data: any) => {
      const messages: Record<string, string> = {
        'order.created': `Đơn hàng mới: ${data.code} — ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(data.total ?? '0'))}`,
        'order.status_changed': `Đơn ${data.code} → ${data.status}`,
        'stock.low': `${t('inventory.lowStock')}: ${data.productName}`,
        'order.payment_received': `Nhận thanh toán đơn ${data.code}`,
        'system.alert': data.message ?? 'Thông báo hệ thống',
      };

      setNotifications((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type,
          message: messages[type] ?? 'Thông báo mới',
          timestamp: new Date(),
          read: false,
        },
        ...prev.slice(0, 49), // keep last 50
      ]);
    };

    const events: Notification['type'][] = [
      'order.created', 'order.status_changed', 'stock.low',
      'order.payment_received', 'system.alert',
    ];
    events.forEach((event) => socket.on(event, (data) => addNotification(event, data)));

    return () => {
      events.forEach((event) => socket.off(event));
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Thông báo {unreadCount > 0 && <span className="text-blue-600">({unreadCount})</span>}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Không có thông báo nào
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG['system.alert'];
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                      !n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(n.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
