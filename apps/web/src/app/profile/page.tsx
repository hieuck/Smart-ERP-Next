// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { Camera, Save } from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', avatar: '', preferences: { theme: 'light', language: 'vi' } });
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    apiClient.get('/users/me')
      .then(res => {
        setUser(res.data);
        setForm({
          name: res.data.name || '',
          phone: res.data.phone || '',
          avatar: res.data.avatar || '',
          preferences: res.data.preferences || { theme: 'light', language: 'vi' },
        });
        setAvatarPreview(res.data.avatar || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setForm(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch('/users/profile', form);
      alert(t('common.success'));
    } catch (err) {
      console.error(err);
      alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">{t('common.loading')}</div>;

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">{t('profile.title')}</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <img src={avatarPreview || '/default-avatar.png'} alt="Avatar" className="w-24 h-24 rounded-full object-cover border" />
              <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('profile.avatarHelp')}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.phone')}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.theme')}</label>
            <select
              value={form.preferences.theme}
              onChange={e => setForm(prev => ({ ...prev, preferences: { ...prev.preferences, theme: e.target.value as 'light' | 'dark' } }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.language')}</label>
            <select
              value={form.preferences.language}
              onChange={e => setForm(prev => ({ ...prev, preferences: { ...prev.preferences, language: e.target.value } }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.saving') : t('actions.save')}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}

