// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDollarSign, FiRefreshCw, FiCheckCircle, FiFileText } from 'react-icons/fi';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Card, Button, Badge, DataTable, StatCard } from '@smart-erp/ui';

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

export default function PayrollPage() {
  const { t } = useTranslation('common');
  const [boards, setBoards] = useState<SalaryBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<SalaryBoard | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchBoards(); }, []);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<SalaryBoard[]>('/hr/payroll/boards');
      setBoards(res.data);
      if (res.data.length > 0 && !selectedBoard) {
        handleSelectBoard(res.data[0]);
      }
    } catch(e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBoard = async (board: SalaryBoard) => {
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
  };

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
    { header: 'Tên bảng lương', accessor: (b: SalaryBoard) => <span className="font-semibold">{b.name}</span> },
    { header: 'Kỳ lương', accessor: (b: SalaryBoard) => `${b.month}/${b.year}` },
    { header: 'Nhân viên', accessor: (b: SalaryBoard) => b.totalEmployees },
    { header: 'Tổng quỹ lương', accessor: (b: SalaryBoard) => <span className="font-bold text-indigo-600">{formatCurrency(b.totalNetSalary)}</span> },
    {
      header: 'Trạng thái',
      accessor: (b: SalaryBoard) => (
        <Badge variant={b.status === 'approved' ? 'success' : b.status === 'paid' ? 'primary' : 'warning'}>
          {b.status === 'approved' ? 'Đã duyệt' : b.status === 'paid' ? 'Đã chi trả' : 'Bản nháp'}
        </Badge>
      ),
    },
    {
      header: 'Thao tác',
      accessor: (b: SalaryBoard) => (
        <Button size="sm" variant={selectedBoard?.id === b.id ? 'primary' : 'secondary'} onClick={() => handleSelectBoard(b)}>
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const payslipColumns = [
    { header: 'Nhân viên', accessor: (p: Payslip) => <span className="font-medium text-gray-900 dark:text-white">{p.employee_name}</span> },
    { header: 'Lương cơ bản', accessor: (p: Payslip) => formatCurrency(p.base_salary) },
    { header: 'Ngày công', accessor: (p: Payslip) => <span className="text-green-600">{p.actual_work_days} / {p.standard_work_days}</span> },
    { header: 'Làm thêm (OT)', accessor: (p: Payslip) => <span className="text-orange-500">{Number(p.overtime_hours).toFixed(1)}h</span> },
    { header: 'Khấu trừ (Trễ)', accessor: (p: Payslip) => <span className="text-red-500">-{formatCurrency(p.deductions)}</span> },
    { header: 'Lương OT', accessor: (p: Payslip) => <span className="text-green-600">+{formatCurrency(p.overtime_pay)}</span> },
    { header: 'Thực lĩnh (Net)', accessor: (p: Payslip) => <span className="font-bold text-indigo-600">{formatCurrency(p.net_salary)}</span> },
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tính Lương & Payroll</h2>
            <p className="text-sm text-gray-500 mt-1">Tự động hóa tính lương dựa trên dữ liệu chấm công</p>
          </div>
          <Button
            variant="success"
            icon={<FiRefreshCw className={generating ? 'animate-spin' : ''} />}
            loading={generating}
            onClick={handleGenerate}
          >
            Tổng hợp lương tháng này
          </Button>
        </div>

        {/* Bảng danh sách Board */}
        <Card className="shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <FiDollarSign className="text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Lịch sử Bảng lương</h3>
          </div>
          <DataTable
            data={boards}
            columns={boardColumns}
            loading={loading}
            emptyMessage="Chưa có bảng lương nào được tạo"
          />
        </Card>

        {/* Chi tiết Payslips */}
        {selectedBoard && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FiFileText /> Chi tiết {selectedBoard.name}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Tổng nhân sự" value={selectedBoard.totalEmployees} className="bg-white dark:bg-gray-800" />
              <StatCard title="Quỹ lương (Net)" value={formatCurrency(selectedBoard.totalNetSalary)} className="bg-white dark:bg-gray-800 border-l-4 border-indigo-500" />
              <StatCard title="Trạng thái" value={selectedBoard.status.toUpperCase()} className="bg-white dark:bg-gray-800" />
            </div>

            <Card className="shadow-sm overflow-hidden">
              <DataTable
                data={payslips}
                columns={payslipColumns}
                loading={payslipsLoading}
                emptyMessage="Không có phiếu lương nào"
              />
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
