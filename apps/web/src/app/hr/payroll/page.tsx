'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, RefreshCw, FileText, Plus } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { DataTable, Button, PageHeader } from '@smart-erp/shared';

interface SalaryBoard {
  id: string;
  name: string;
  month: string;
  year: string;
  status: string;
  totalEmployees: string;
  totalNetSalary: string;
}

interface Payslip {
  id: string;
  employee_name: string;
  base_salary: string;
  standard_work_days: string;
  actual_work_days: string;
  overtime_hours: string;
  overtime_pay: string;
  deductions: string;
  net_salary: string;
}

const BADGE_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function PayrollPage() {
  const { t } = useTranslation('common');
  const [boards, setBoards] = useState<SalaryBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<SalaryBoard | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleSelectBoard = useCallback(async (board: SalaryBoard) => {
    setSelectedBoard(board);
    setPayslipsLoading(true);
    try {
      const res = await apiClient.get<Payslip[]>(`/hr/payroll/boards/${board.id}/payslips`);
      setPayslips(res.data);
    } catch(e) {
      setPayslips([]);
    } finally {
      setPayslipsLoading(false);
    }
  }, []);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<SalaryBoard[]>('/hr/payroll/boards');
      setBoards(res.data);
      if (res.data.length > 0 && !selectedBoard) {
        await handleSelectBoard(res.data[0]);
      }
    } catch(e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [handleSelectBoard, selectedBoard]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      await apiClient.post('/hr/payroll/boards/generate', { month: now.getMonth() + 1, year: now.getFullYear() });
      await fetchBoards();
    } catch (e) {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (val: string | number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));

  const boardColumns = [
    { label: 'Tên bảng lương', render: (b: SalaryBoard) => <span className="font-semibold">{b.name}</span> },
    { label: 'Kỳ lương', render: (b: SalaryBoard) => `${b.month}/${b.year}` },
    { label: 'Nhân viên', render: (b: SalaryBoard) => b.totalEmployees },
    { label: 'Tổng quỹ lương', render: (b: SalaryBoard) => <span className="font-bold text-indigo-600">{formatCurrency(b.totalNetSalary)}</span> },
    {
      label: 'Trạng thái',
      render: (b: SalaryBoard) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[b.status] || 'bg-yellow-100 text-yellow-700'}`}>
          {b.status === 'approved' ? 'Đã duyệt' : b.status === 'paid' ? 'Đã chi trả' : 'Bản nháp'}
        </span>
      ),
    },
    {
      label: '',
      render: (b: SalaryBoard) => (
        <Button size="sm" variant={selectedBoard?.id === b.id ? 'primary' : 'secondary'} onClick={() => handleSelectBoard(b)}>
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const payslipColumns = [
    { label: 'Nhân viên', render: (p: Payslip) => <span className="font-medium text-gray-900 dark:text-white">{p.employee_name}</span> },
    { label: 'Lương cơ bản', render: (p: Payslip) => formatCurrency(p.base_salary) },
    { label: 'Ngày công', render: (p: Payslip) => <span className="text-green-600">{p.actual_work_days} / {p.standard_work_days}</span> },
    { label: 'Làm thêm (OT)', render: (p: Payslip) => <span className="text-orange-500">{Number(p.overtime_hours).toFixed(1)}h</span> },
    { label: 'Khấu trừ (Trừ…)', render: (p: Payslip) => <span className="text-red-500">-{formatCurrency(p.deductions)}</span> },
    { label: 'Lương OT', render: (p: Payslip) => <span className="text-green-600">+{formatCurrency(p.overtime_pay)}</span> },
    { label: 'Thực lĩnh (Net)', render: (p: Payslip) => <span className="font-bold text-indigo-600">{formatCurrency(p.net_salary)}</span> },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Tính lương & Payroll"
          description="Tự động hóa tính lương dựa trên dữ liệu chấm công"
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="indigo"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                loading={generating}
                onClick={handleGenerate}
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                Tổng hợp lương tháng này
              </Button>
            </div>
          }
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <DollarSign className="w-4 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Lịch sử bảng lương</h3>
          </div>
          <DataTable
            data={boards}
            columns={boardColumns}
            loading={loading}
            emptyMessage="Chưa có bảng lương nào được tạo"
          />
        </div>

        {selectedBoard && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <FileText className="w-5 h-5 text-indigo-500" /> Chi tiết {selectedBoard.name}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tổng nhân sự</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedBoard.totalEmployees}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-indigo-500">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Quỹ lương (Net)</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(selectedBoard.totalNetSalary)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Trạng thái</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedBoard.status.toUpperCase()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <DataTable
                data={payslips}
                columns={payslipColumns}
                loading={payslipsLoading}
                emptyMessage="Không có phiếu lương nào"
              />
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
