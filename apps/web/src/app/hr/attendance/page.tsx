// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, LogIn, LogOut, Calendar,
  CheckCircle, AlertTriangle, XCircle, Sun,
  Users, FileText,
} from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { DataTable, Button } from '@smart-erp/shared';

interface TodayStatus {
  status: string;
  checkInAt?: string;
  checkOutAt?: string;
  actualHours?: string;
  overtimeHours?: string;
  lateMinutes?: number;
  workDate: string;
}

interface MonthlySummary {
  present_days: number;
  late_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  total_hours: string;
  total_overtime: string;
  total_late_minutes: number;
}

interface AttendanceRecord {
  id: string;
  employee_name: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  actual_hours: string;
  overtime_hours: string;
  status: string;
  late_minutes: number;
  shift_name: string | null;
}

interface LeaveRequest {
  id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: string;
  status: string;
  reason: string | null;
}

const STATUS_CONFIG: Record<string, { colorClass: string; icon: React.ReactNode }> = {
  present:  { colorClass: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  late:     { colorClass: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  absent:   { colorClass: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  half_day: { colorClass: 'bg-blue-100 text-blue-700', icon: <Sun className="w-3.5 h-3.5" /> },
  leave:    { colorClass: 'bg-blue-100 text-blue-700', icon: <Calendar className="w-3.5 h-3.5" /> },
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual:       '#2563eb',
  sick:         '#dc2626',
  unpaid:       '#6b7280',
  maternity:    '#7c3aed',
  paternity:    '#0891b2',
  compensatory: '#059669',
};

const TABS = ['overview', 'records', 'leave'] as const;
type Tab = typeof TABS[number];

export default function AttendancePage() {
  const { t } = useTranslation('common');
  const [tab, setTab] = useState<Tab>('overview');
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaveReqs, setLeaveReqs] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [todayRes, summaryRes, recordsRes, leaveRes] = await Promise.all([
        apiClient.get<TodayStatus>('/hr/attendance/today'),
        apiClient.get<MonthlySummary>('/hr/attendance/summary/monthly'),
        apiClient.get<AttendanceRecord[]>('/hr/attendance/records?limit=20'),
        apiClient.get<LeaveRequest[]>('/hr/attendance/leave'),
      ]);
      setToday(todayRes.data);
      setSummary(summaryRes.data);
      setRecords((recordsRes.data as any) || []);
      setLeaveReqs((leaveRes.data as any) || []);
    } catch {
      setToday(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading('checkin');
    try {
      await apiClient.post('/hr/attendance/check-in', { method: 'app' });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading('checkout');
    try {
      await apiClient.post('/hr/attendance/check-out', { method: 'app' });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveLeave = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/hr/attendance/leave/${id}/approve`, {});
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (ts?: string | null) =>
    ts ? new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const isCheckedIn  = today?.checkInAt && !today?.checkOutAt;
  const isCheckedOut = today?.checkInAt && today?.checkOutAt;

  const recordColumns = [
    { label: t('hr.employees.name'), render: (r: AttendanceRecord) => r.employee_name },
    {
      label: t('attendance.shift'),
      render: (r: AttendanceRecord) => r.shift_name ?? <span className="text-gray-400">â€”</span>,
    },
    {
      label: t('attendance.checkIn'),
      render: (r: AttendanceRecord) => (
        <span className="font-mono">{formatTime(r.check_in_at)}</span>
      ),
    },
    {
      label: t('attendance.checkOut'),
      render: (r: AttendanceRecord) => (
        <span className="font-mono">{formatTime(r.check_out_at)}</span>
      ),
    },
    {
      label: t('attendance.workHours'),
      render: (r: AttendanceRecord) => r.actual_hours ? `${Number(r.actual_hours).toFixed(1)}h` : 'â€”',
    },
    {
      label: t('attendance.overtime'),
      render: (r: AttendanceRecord) => Number(r.overtime_hours) > 0
        ? <span className="font-semibold text-orange-500">+{Number(r.overtime_hours).toFixed(1)}h</span>
        : <span className="text-gray-400">â€”</span>,
    },
    {
      label: t('attendance.status') || 'Tráº¡ng thÃ¡i',
      render: (r: AttendanceRecord) => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.present;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.colorClass}`}>
            {cfg.icon} {t(`attendance.${r.status}`) || r.status}
          </span>
        );
      },
    },
  ];

  const leaveColumns = [
    { label: t('hr.employees.name'), render: (l: LeaveRequest) => l.employee_name },
    {
      label: t('attendance.leave.title'),
      render: (l: LeaveRequest) => (
        <span style={{ color: LEAVE_TYPE_COLORS[l.leave_type] || '#374151' }} className="font-semibold">
          {t(`attendance.leave.types.${l.leave_type}`) || l.leave_type}
        </span>
      ),
    },
    {
      label: t('attendance.leave.startDate'),
      render: (l: LeaveRequest) => new Date(l.start_date).toLocaleDateString('vi-VN'),
    },
    {
      label: t('attendance.leave.endDate'),
      render: (l: LeaveRequest) => new Date(l.end_date).toLocaleDateString('vi-VN'),
    },
    {
      label: t('attendance.leave.totalDays'),
      render: (l: LeaveRequest) => <span className="font-bold">{l.total_days}</span>,
    },
    {
      label: t('attendance.leave.statuses.pending'),
      render: (l: LeaveRequest) => {
        const colorClass = l.status === 'approved' ? 'bg-green-100 text-green-700'
          : l.status === 'rejected' ? 'bg-red-100 text-red-700'
          : l.status === 'cancelled' ? 'bg-gray-100 text-gray-700'
          : 'bg-yellow-100 text-yellow-700';
        return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{t(`attendance.leave.statuses.${l.status}`) || l.status}</span>;
      },
    },
    {
      label: t('common.actions') || 'Thao tÃ¡c',
      render: (l: LeaveRequest) => l.status === 'pending' ? (
        <Button
          size="sm"
          variant="success"
          loading={actionLoading === l.id}
          onClick={() => handleApproveLeave(l.id)}
        >
          {t('actions.approve')}
        </Button>
      ) : <span className="text-gray-400">â€”</span>,
    },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('attendance.title')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t('attendance.subtitle')}</p>
          </div>
          {/* Check-in / Check-out buttons */}
          <div className="flex gap-2">
            {!isCheckedIn && !isCheckedOut ? (
              <Button
                variant="success"
                loading={actionLoading === 'checkin'}
                onClick={handleCheckIn}
              >
                <LogIn className="w-4 h-4" /> {t('attendance.checkIn')}
              </Button>
            ) : null}
            {isCheckedIn ? (
              <Button
                variant="danger"
                loading={actionLoading === 'checkout'}
                onClick={handleCheckOut}
              >
                <LogOut className="w-4 h-4" /> {t('attendance.checkOut')}
              </Button>
            ) : null}
            {isCheckedOut ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> {t('attendance.checkedIn')} â€” {formatTime(today?.checkOutAt)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Today card */}
        {today ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-semibold">{t('attendance.today')} â€” {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatTime(today.checkInAt)} â†’ {formatTime(today.checkOutAt)}
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                {today.actualHours ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(today.actualHours).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500">{t('attendance.workHours')}</p>
                  </div>
                ) : null}
                {Number(today.overtimeHours) > 0 ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">+{Number(today.overtimeHours).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500">{t('attendance.overtime')}</p>
                  </div>
                ) : null}
                {Number(today.lateMinutes) > 0 ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{today.lateMinutes}m</p>
                    <p className="text-xs text-gray-500">{t('attendance.late')}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Monthly stats */}
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-green-500">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{t('attendance.totalDays')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.present_days}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>{t('attendance.lateCount')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.late_days}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-red-400">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>{t('attendance.absences')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.absent_days}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Sun className="w-4 h-4 text-orange-400" />
                <span>{t('attendance.halfDay') || 'Ná»­a ngÃ y'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.half_days}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>{t('attendance.onLeave')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.leave_days}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>{t('attendance.totalHours')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{`${Number(summary.total_hours).toFixed(1)}h`}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-orange-400">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{t('attendance.totalOT')}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{`${Number(summary.total_overtime).toFixed(1)}h`}</p>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {([
            { key: 'overview', label: t('attendance.today'), icon: <Clock /> },
            { key: 'records',  label: t('attendance.monthly'), icon: <Users /> },
            { key: 'leave',    label: t('attendance.leave.title'), icon: <FileText /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === key
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'records' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <DataTable
              data={records}
              columns={recordColumns}
              loading={loading}
              emptyMessage={t('common.noData')}
            />
          </div>
        ) : tab === 'leave' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between">
              <h3 className="font-semibold">{t('attendance.leave.title')}</h3>
              <Button size="sm" variant="primary">
                <FileText className="w-4 h-4" /> {t('attendance.leave.create')}
              </Button>
            </div>
            <DataTable
              data={leaveReqs}
              columns={leaveColumns}
              loading={loading}
              emptyMessage={t('common.noData')}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">{t('attendance.monthly')}</p>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
