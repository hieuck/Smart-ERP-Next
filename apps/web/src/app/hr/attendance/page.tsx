'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiClock, FiLogIn, FiLogOut, FiCalendar,
  FiCheckCircle, FiAlertTriangle, FiXCircle, FiSun,
  FiUsers, FiFileText,
} from 'react-icons/fi';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Card, Button, Badge, DataTable, StatCard } from '@smart-erp/ui';

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

const STATUS_CONFIG: Record<string, { variant: 'success' | 'danger' | 'warning' | 'secondary' | 'primary', icon: React.ReactNode }> = {
  present:  { variant: 'success',   icon: <FiCheckCircle /> },
  late:     { variant: 'warning',   icon: <FiAlertTriangle /> },
  absent:   { variant: 'danger',    icon: <FiXCircle /> },
  half_day: { variant: 'primary',   icon: <FiSun /> },
  leave:    { variant: 'secondary', icon: <FiCalendar /> },
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
    { header: t('hr.employees.name'), accessor: (r: AttendanceRecord) => r.employee_name },
    {
      header: t('attendance.shift'),
      accessor: (r: AttendanceRecord) => r.shift_name ?? <span className="text-gray-400">—</span>,
    },
    {
      header: t('attendance.checkIn'),
      accessor: (r: AttendanceRecord) => (
        <span className="font-mono">{formatTime(r.check_in_at)}</span>
      ),
    },
    {
      header: t('attendance.checkOut'),
      accessor: (r: AttendanceRecord) => (
        <span className="font-mono">{formatTime(r.check_out_at)}</span>
      ),
    },
    {
      header: t('attendance.workHours'),
      accessor: (r: AttendanceRecord) => r.actual_hours ? `${Number(r.actual_hours).toFixed(1)}h` : '—',
    },
    {
      header: t('attendance.overtime'),
      accessor: (r: AttendanceRecord) => Number(r.overtime_hours) > 0
        ? <span className="font-semibold text-orange-500">+{Number(r.overtime_hours).toFixed(1)}h</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      header: t('attendance.status') || 'Trạng thái',
      accessor: (r: AttendanceRecord) => {
        const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.present;
        return (
          <Badge variant={cfg.variant} icon={cfg.icon}>
            {t(`attendance.${r.status}`) || r.status}
          </Badge>
        );
      },
    },
  ];

  const leaveColumns = [
    { header: t('hr.employees.name'), accessor: (l: LeaveRequest) => l.employee_name },
    {
      header: t('attendance.leave.title'),
      accessor: (l: LeaveRequest) => (
        <span style={{ color: LEAVE_TYPE_COLORS[l.leave_type] || '#374151' }} className="font-semibold">
          {t(`attendance.leave.types.${l.leave_type}`) || l.leave_type}
        </span>
      ),
    },
    {
      header: t('attendance.leave.startDate'),
      accessor: (l: LeaveRequest) => new Date(l.start_date).toLocaleDateString('vi-VN'),
    },
    {
      header: t('attendance.leave.endDate'),
      accessor: (l: LeaveRequest) => new Date(l.end_date).toLocaleDateString('vi-VN'),
    },
    {
      header: t('attendance.leave.totalDays'),
      accessor: (l: LeaveRequest) => <span className="font-bold">{l.total_days}</span>,
    },
    {
      header: t('attendance.leave.statuses.pending'),
      accessor: (l: LeaveRequest) => {
        const variant = l.status === 'approved' ? 'success'
          : l.status === 'rejected' ? 'danger'
          : l.status === 'cancelled' ? 'secondary'
          : 'warning';
        return <Badge variant={variant as any}>{t(`attendance.leave.statuses.${l.status}`) || l.status}</Badge>;
      },
    },
    {
      header: t('common.actions') || 'Thao tác',
      accessor: (l: LeaveRequest) => l.status === 'pending' ? (
        <Button
          size="sm"
          variant="success"
          loading={actionLoading === l.id}
          onClick={() => handleApproveLeave(l.id)}
        >
          {t('actions.approve')}
        </Button>
      ) : <span className="text-gray-400">—</span>,
    },
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
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
                icon={<FiLogIn />}
                loading={actionLoading === 'checkin'}
                onClick={handleCheckIn}
              >
                {t('attendance.checkIn')}
              </Button>
            ) : null}
            {isCheckedIn ? (
              <Button
                variant="danger"
                icon={<FiLogOut />}
                loading={actionLoading === 'checkout'}
                onClick={handleCheckOut}
              >
                {t('attendance.checkOut')}
              </Button>
            ) : null}
            {isCheckedOut ? (
              <Badge variant="success" icon={<FiCheckCircle />}>
                {t('attendance.checkedIn')} — {formatTime(today?.checkOutAt)}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Today card */}
        {today ? (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <FiClock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-semibold">{t('attendance.today')} — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatTime(today.checkInAt)} → {formatTime(today.checkOutAt)}
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
          </Card>
        ) : null}

        {/* Monthly stats */}
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard title={t('attendance.totalDays')}  value={summary.present_days}              icon={<FiCheckCircle className="w-4 h-4 text-green-500" />} className="border-l-4 border-l-green-500" />
            <StatCard title={t('attendance.lateCount')}  value={summary.late_days}                 icon={<FiAlertTriangle className="w-4 h-4 text-yellow-500" />} />
            <StatCard title={t('attendance.absences')}   value={summary.absent_days}               icon={<FiXCircle className="w-4 h-4 text-red-500" />} className="border-l-4 border-l-red-400" />
            <StatCard title={t('attendance.halfDay') || 'Nửa ngày'} value={summary.half_days}      icon={<FiSun className="w-4 h-4 text-orange-400" />} />
            <StatCard title={t('attendance.onLeave')}    value={summary.leave_days}                icon={<FiCalendar className="w-4 h-4 text-blue-500" />} />
            <StatCard title={t('attendance.totalHours')} value={`${Number(summary.total_hours).toFixed(1)}h`}    icon={<FiClock className="w-4 h-4 text-indigo-500" />} />
            <StatCard title={t('attendance.totalOT')}    value={`${Number(summary.total_overtime).toFixed(1)}h`} icon={<FiClock className="w-4 h-4 text-orange-500" />} className="border-l-4 border-l-orange-400" />
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {([
            { key: 'overview', label: t('attendance.today'), icon: <FiClock /> },
            { key: 'records',  label: t('attendance.monthly'), icon: <FiUsers /> },
            { key: 'leave',    label: t('attendance.leave.title'), icon: <FiFileText /> },
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
          <Card className="shadow-sm">
            <DataTable
              data={records}
              columns={recordColumns}
              loading={loading}
              emptyMessage={t('common.noData')}
            />
          </Card>
        ) : tab === 'leave' ? (
          <Card className="shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between">
              <h3 className="font-semibold">{t('attendance.leave.title')}</h3>
              <Button size="sm" variant="primary" icon={<FiFileText />}>
                {t('attendance.leave.create')}
              </Button>
            </div>
            <DataTable
              data={leaveReqs}
              columns={leaveColumns}
              loading={loading}
              emptyMessage={t('common.noData')}
            />
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <FiCalendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">{t('attendance.monthly')}</p>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
