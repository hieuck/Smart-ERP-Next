'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Eye, EyeOff, Lock, Mail, UserPlus, Users } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import { validatePassword } from './password-validation';

export default function RegisterPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { valid: passwordIsValid, strength: passwordStrength, checks: passwordChecks } = validatePassword(password);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.confirmPasswordMismatch'));
      return;
    }

    if (!passwordChecks.length) {
      setError(t('auth.passwordTooShort', { defaultValue: 'Password must be at least 8 characters' }));
      return;
    }
    if (!passwordIsValid) {
      setError(t('auth.passwordComplexity'));
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password,
      });
      const { access_token, user } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenant_id', user.tenantId);
      document.cookie = `access_token=${encodeURIComponent(access_token)}; Path=/; Max-Age=604800; SameSite=Lax`;
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="text-center mb-8 block">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('appName')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('auth.registerSubtitle')}
          </p>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('auth.register')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.companyName')}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder={t('auth.companyNamePlaceholder')}
                  required
                  minLength={2}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= passwordStrength
                            ? passwordStrength <= 2
                              ? 'bg-red-500'
                              : passwordStrength <= 3
                                ? 'bg-yellow-500'
                                : passwordStrength <= 4
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    <li className={passwordChecks.length ? 'text-green-600 dark:text-green-400' : ''}>
                      {t('auth.passwordRequirementLength', { defaultValue: 'At least 8 characters' })}
                    </li>
                    <li className={passwordChecks.uppercase ? 'text-green-600 dark:text-green-400' : ''}>
                      {t('auth.passwordRequirementUppercase', { defaultValue: 'One uppercase letter' })}
                    </li>
                    <li className={passwordChecks.lowercase ? 'text-green-600 dark:text-green-400' : ''}>
                      {t('auth.passwordRequirementLowercase', { defaultValue: 'One lowercase letter' })}
                    </li>
                    <li className={passwordChecks.digit ? 'text-green-600 dark:text-green-400' : ''}>
                      {t('auth.passwordRequirementDigit', { defaultValue: 'One digit' })}
                    </li>
                    <li className={passwordChecks.special ? 'text-green-600 dark:text-green-400' : ''}>
                      {t('auth.passwordRequirementSpecial', { defaultValue: 'One special character' })}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? t('auth.registering') : t('auth.register')}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('auth.haveAccount')}{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

