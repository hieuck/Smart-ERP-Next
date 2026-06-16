'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { Send, MessageCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  sentAt: string;
  isRead: string;
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value : [];

export default function ChatPage() {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    apiClient.get('/users').then(res => setUsers(asArray<User>(res.data?.items ?? res.data)));
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    apiClient.get(`/chat/conversation/${selectedUser.id}`).then(res => setMessages(asArray<Message>(res.data?.items ?? res.data))).catch(() => setMessages([]));
    // Poll every 3 seconds for new messages
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/chat/conversation/${selectedUser.id}`);
        setMessages(asArray<Message>(res.data?.items ?? res.data));
      } catch {
        setMessages([]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const fetchUnreadCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const user of users) {
      try {
        const res = await apiClient.get(`/chat/unread?withUserId=${user.id}`);
        counts[user.id] = res.data.unreadCount;
      } catch {
        counts[user.id] = 0;
      }
    }
    setUnreadCounts(counts);
  }, [users]);

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 5000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;
    setSending(true);
    try {
      await apiClient.post('/chat/send', { toUserId: selectedUser.id, content: newMessage });
      setNewMessage('');
      const res = await apiClient.get(`/chat/conversation/${selectedUser.id}`);
      setMessages(asArray<Message>(res.data?.items ?? res.data));
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-[calc(100vh-4rem)] p-6 gap-6">
        {/* User list */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">{t('chat.users')}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                  selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.name || user.email}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  {unreadCounts[user.id] > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {unreadCounts[user.id]}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {selectedUser ? (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">{selectedUser.name || selectedUser.email}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => {
                const isOwn = msg.fromUserId === selectedUser.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      isOwn ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-blue-600 text-white'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.sentAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                placeholder={t('chat.typeMessage')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('chat.selectUser')}</p>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

