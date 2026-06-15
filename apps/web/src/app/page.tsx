'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Factory,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react';

const modules = [
  { key: 'pos', icon: ShoppingCart },
  { key: 'inventory', icon: PackageSearch },
  { key: 'crm', icon: Users },
  { key: 'accounting', icon: ReceiptText },
  { key: 'manufacturing', icon: Factory },
  { key: 'reports', icon: BarChart3 },
];

const moduleNames: Record<string, string> = {
  pos: 'POS và bán hàng',
  inventory: 'Kho và tồn kho',
  crm: 'Khách hàng CRM',
  accounting: 'Kế toán và hóa đơn',
  manufacturing: 'Sản xuất và MRP',
  reports: 'Báo cáo điều hành',
};

export default function LandingPage() {
  const { t, i18n } = useTranslation('common');
  const l = (key: string) => {
    const translated = t(`landing.${key}`, '');
    if (translated && translated !== `landing.${key}`) return translated;
    return t(`landing.${key}`, '');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-slate-950">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span>Smart ERP Next</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="rounded-md px-3 py-2 text-slate-200 hover:bg-white/10">
              {l('ctaLogin')}
            </Link>
            <Link href="/register" className="rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">
              {l('ctaFree')}
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1fr_0.9fr] md:py-16 lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              {l('heroBadge')}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              {l('heroTitle')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {l('heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
                {l('ctaFree')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-md border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/10">
                {l('ctaLogin')}
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white p-3 text-slate-900 shadow-2xl shadow-cyan-950/40">
            <div className="rounded-md border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">{l('demoDashboard')}</p>
                  <p className="font-semibold text-slate-950">{l('demoOverview')}</p>
                </div>
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Online</span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {[
                  [l('demoRevenue'), '154.2M VND'],
                  [l('demoOrders'), '152'],
                  [l('demoCustomers'), '84'],
                  [l('demoProducts'), '340'],
                ].map(([label, value]) => (
                  <div key={`${label}`} className="rounded-md border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold">{l('demoRecentOrders')}</p>
                  <span className="text-sm text-cyan-700">{l('demoProcessing')}</span>
                </div>
                <div className="space-y-2 text-sm">
                  {['DH-000015 - Nguyễn An', 'DH-000014 - Công ty Minh Phát', 'DH-000013 - Cửa hàng Hoa Sen'].map((order) => (
                    <div key={order} className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2">
                      <span>{order}</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ key, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950 px-4 py-4">
                <Icon className="h-5 w-5 text-cyan-300" />
                <span className="font-medium">{moduleNames[key] || key}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-[0.8fr_1fr] lg:px-8">
        <div>
          <h2 className="text-2xl font-bold">{l('readinessTitle')}</h2>
          <p className="mt-3 text-slate-300">{l('readinessSubtitle')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            l('readinessItem1'),
            l('readinessItem2'),
            l('readinessItem3'),
            l('readinessItem4'),
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-slate-900 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <span className="text-slate-200">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Smart ERP Next</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">{l('footerPrivacy')}</Link>
            <Link href="/terms" className="hover:text-white">{l('footerTerms')}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}