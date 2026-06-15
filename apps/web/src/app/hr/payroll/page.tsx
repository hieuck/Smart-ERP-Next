// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, RefreshCw, FileText } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { DataTable, Button } from '@smart-erp/shared';

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
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-blue-100 text-blue-700',
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
    { label: 'TÃªn báº£ng lÆ°Æ¡ng', render: (b: SalaryBoard) => <span className="font-semibold">{b.name}</span> },
    { label: 'Ká»³ lÆ°Æ¡ng', render: (b: SalaryBoard) => `${b.month}/${b.year}` },
    { label: 'NhÃ¢n viÃªn', render: (b: SalaryBoard) => b.totalEmployees },
    { label: 'Tá»•ng quá»¹ lÆ°Æ¡ng', render: (b: SalaryBoard) => <span className="font-bold text-indigo-600">{formatCurrency(b.totalNetSalary)}</span> },
    {
      label: 'Tráº¡ng thÃ¡i',
      render: (b: SalaryBoard) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[b.status] || 'bg-yellow-100 text-yellow-700'}`}>
          {b.status === 'approved' ? 'ÄÃ£ duyá»‡t' : b.status === 'paid' ? 'ÄÃ£ chi tráº£' : 'Báº£n nhÃ¡p'}
        </span>
      ),
    },
    {
      label: 'Thao tÃ¡c',
      render: (b: SalaryBoard) => (
        <Button size="sm" variant={selectedBoard?.id === b.id ? 'primary' : 'secondary'} onClick={() => handleSelectBoard(b)}>
          Xem chi tiáº¿t
        </Button>
      ),
    },
  ];

  const payslipColumns = [
    { label: 'NhÃ¢n viÃªn', render: (p: Payslip) => <span className="font-medium text-gray-900 dark:text-white">{p.employee_name}</span> },
    { label: 'LÆ°Æ¡ng cÆ¡ báº£n', render: (p: Payslip) => formatCurrency(p.base_salary) },
    { label: 'NgÃ y cÃ´ng', render: (p: Payslip) => <span className="text-green-600">{p.actual_work_days} / {p.standard_work_days}</span> },
    { label: 'LÃ m thÃªm (OT)', render: (p: Payslip) => <span className="text-orange-500">{Number(p.overtime_hours).toFixed(1)}h</span> },
    { label: 'Kháº¥u trá»« (Trá»…)', render: (p: Payslip) => <span className="text-red-500">-{formatCurrency(p.deductions)}</span> },
    { label: 'LÆ°Æ¡ng OT', render: (p: Payslip) => <span className="text-green-600">+{formatCurrency(p.overtime_pay)}</span> },
    { label: 'Thá»±c lÄ©nh (Net)', render: (p: Payslip) => <span className="font-bold text-indigo-600">{formatCurrency(p.net_salary)}</span> },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">TÃ­nh LÆ°Æ¡ng & Payroll</h2>
            <p className="text-sm text-gray-500 mt-1">Tá»± Ä‘á»™ng hÃ³a tÃ­nh lÆ°Æ¡ng dá»±a trÃªn dá»¯ liá»‡u cháº¥m cÃ´ng</p>
          </div>
          <Button
            variant="success"
            loading={generating}
            onClick={handleGenerate}
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Tá»•ng há»£p lÆ°Æ¡ng thÃ¡ng nÃ y
          </Button>
        </div>

        {/* Báº£ng danh sÃ¡ch Board */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Lá»‹ch sá»­ Báº£ng lÆ°Æ¡ng</h3>
          </div>
          <DataTable
            data={boards}
            columns={boardColumns}
            loading={loading}
            emptyMessage="ChÆ°a cÃ³ báº£ng lÆ°Æ¡ng nÃ o Ä‘Æ°á»£c táº¡o"
          />
        </div>

        {/* Chi tiáº¿t Payslips */}
        {selectedBoard && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-4 h-4" /> Chi tiáº¿t {selectedBoard.name}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm text-gray-500 mb-1">Tá»•ng nhÃ¢n sá»±</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedBoard.totalEmployees}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-indigo-500">
                <div className="text-sm text-gray-500 mb-1">Quá»¹ lÆ°Æ¡ng (Net)</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(selectedBoard.totalNetSalary)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm text-gray-500 mb-1">Tráº¡ng thÃ¡i</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedBoard.status.toUpperCase()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <DataTable
                data={payslips}
                columns={payslipColumns}
                loading={payslipsLoading}
                emptyMessage="KhÃ´ng cÃ³ phiáº¿u lÆ°Æ¡ng nÃ o"
              />
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
