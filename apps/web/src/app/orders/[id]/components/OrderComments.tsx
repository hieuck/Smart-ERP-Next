'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { MessageCircle, Send, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string };
}

export function OrderComments({ orderId }: { orderId: string }) {
  const { t, i18n } = useTranslation('common');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiClient.get(`/orders/${orderId}/comments`);
      setComments(res.data.items);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/orders/${orderId}/comments`, { content: newComment });
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Failed to post comment', error);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(t('common.confirmDeleteMessage'))) return;
    try {
      await apiClient.delete(`/orders/${orderId}/comments/${commentId}`);
      await fetchComments();
    } catch (error) {
      console.error('Failed to delete comment', error);
    }
  };

  const locale = i18n.language === 'vi' ? vi : enUS;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-gray-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {t('orders.comments')}
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700 rounded"></div>)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t('orders.noComments')}
        </p>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.user?.name || 'System'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{comment.content}</p>
              </div>
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder={t('orders.commentPlaceholder')}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        />
        <button
          type="submit"
          disabled={sending || !newComment.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
