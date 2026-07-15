'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, Building2, Eye, EyeOff } from 'lucide-react';
import { apiClient, authApi } from '@/lib/api-client';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = emailRef.current?.value.trim() ?? '';
      const password = passwordRef.current?.value ?? '';
      const response = await authApi.login(email, password);
      const { access_token } = response.data;
      let user = response.data.user;
      localStorage.setItem('access_token', access_token);
      if (!user) {
        const profileResponse = await apiClient.get('/auth/profile', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        user = profileResponse.data;
      }
      localStorage.setItem('user', JSON.stringify(user));
      document.cookie = `access_token=${encodeURIComponent(access_token)}; Path=/; Max-Age=604800; SameSite=Lax`;
      if (user?.tenantId) localStorage.setItem('tenant_id', user.tenantId);
      const from = new URLSearchParams(window.location.search).get('from');
      const redirectTo = from?.startsWith('/') && !from.startsWith('//') ? from : '/dashboard';
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
    if (demoEmail && demoPassword && emailRef.current && passwordRef.current) {
      emailRef.current.value = demoEmail;
      passwordRef.current.value = demoPassword;
    }
  };
  const enableDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' &&
    process.env.NEXT_PUBLIC_DEMO_EMAIL &&
    process.env.NEXT_PUBLIC_DEMO_PASSWORD;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="text-center mb-8 block">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('appName')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('auth.loginSubtitle')}
          </p>
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('auth.login')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={emailRef}
                  name="email"
                  type="email"
                  disabled={!mounted || loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.password')}
                </label>
                <button type="button" className="text-xs text-blue-600 hover:underline">
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={passwordRef}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  disabled={!mounted || loading}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !mounted}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('auth.loading')}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('auth.login')}
                </>
              )}
            </button>
          </form>

          {/* Demo credentials — only rendered when explicitly enabled */}
          {enableDemo && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 text-center">{t('auth.demo')}</p>
                <p className="text-xs text-gray-500 font-mono text-center mt-1">
                  {t('auth.demoCredentials')}
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              >
                {t('auth.fillDemo')}
              </button>
            </div>
          </div>
          )}

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('auth.haveAccount')}{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('appName')} v{process.env.NEXT_PUBLIC_APP_VERSION} · MIT License
        </p>
      </div>
    </div>
  );
}

