'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  Target,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  leadScore: number;
  createdAt: string;
  industry?: string;
}

interface NextBestAction {
  action: string;
  priority: number;
  reason: string;
}

interface NBAResponse {
  action: string;
  priority: number;
  reason: string;
}

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Mới', color: '#3b82f6', bg: '#dbeafe' },
  contacted: { label: 'Đã liên hệ', color: '#10b981', bg: '#d1fae5' },
  qualified: { label: 'Tiềm năng', color: '#f59e0b', bg: '#fef3c7' },
  won: { label: 'Thành công', color: '#8b5cf6', bg: '#ede9fe' },
  lost: { label: 'Thất bại', color: '#ef4444', bg: '#fee2e2' },
};

function NBACard({ action, priority, reason }: { action: string; priority: number; reason: string }) {
  const actionIcons: Record<string, React.ReactNode> = {
    call: <Phone className="w-5 h-5" />,
    email: <Mail className="w-5 h-5" />,
    meeting: <Target className="w-5 h-5" />,
    proposal: <TrendingUp className="w-5 h-5" />,
    follow_up: <Clock className="w-5 h-5" />,
  };

  const actionLabels: Record<string, string> = {
    call: 'Gọi điện',
    email: 'Gửi email',
    meeting: 'Hẹn gặp',
    proposal: 'Đề xuất',
    follow_up: 'Theo dõi',
  };

  const colorClass = priority >= 70 ? 'bg-green-50 border-green-200'
    : priority >= 40 ? 'bg-yellow-50 border-yellow-200'
    : 'bg-red-50 border-red-200';

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{actionIcons[action] || <AlertCircle />}</span>
          <span className="font-semibold text-gray-900">{actionLabels[action] || action}</span>
        </div>
        <span className={`text-sm font-bold px-2 py-1 rounded ${
          priority >= 70 ? 'text-green-700 bg-green-100'
          : priority >= 40 ? 'text-yellow-700 bg-yellow-100'
          : 'text-red-700 bg-red-100'
        }`}>
          {priority}%
        </span>
      </div>
      <p className="text-sm text-gray-600">{reason}</p>
    </div>
  );
}

export default function CRMPage() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [nba, setNba] = useState<NBAResponse | null>(null);
  const [nbaLoading, setNbaLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams({ search, ...(statusFilter && { status: statusFilter }) });
      const res = await apiClient.get(`/crm/leads?${params}`);
      setLeads(res.data.items || res.data || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNBA = async (leadId: string) => {
    try {
      setNbaLoading(true);
      const res = await apiClient.get<NBAResponse>(`/crm/next-best-action/lead/${leadId}`);
      setNba(res.data);
    } catch (err) {
      console.error('Failed to fetch NBA:', err);
    } finally {
      setNbaLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setNba(null);
    fetchNBA(lead.id);
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">{t('common.loading', 'Đang tải...')}</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('crm.title', 'CRM')}</h1>
          <p className="text-sm text-gray-500">{t('crm.subtitle', 'Quản lý khách hàng tiềm năng')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('crm.searchLeads', 'Tìm kiếm lead...')}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('orders.statusAll', 'Tất cả')}</option>
          <option value="new">Mới</option>
          <option value="contacted">Đã liên hệ</option>
          <option value="qualified">Tiềm năng</option>
          <option value="won">Thành công</option>
          <option value="lost">Thất bại</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Tổng lead</div>
          <div className="text-2xl font-bold text-gray-900">{leads.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Mới</div>
          <div className="text-2xl font-bold text-blue-600">
            {leads.filter(l => l.status === 'new').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Đã liên hệ</div>
          <div className="text-2xl font-bold text-green-600">
            {leads.filter(l => l.status === 'contacted').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Win rate</div>
          <div className="text-2xl font-bold text-purple-600">
            {leads.length > 0 ? Math.round(leads.filter(l => l.status === 'won').length / leads.length * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Lead List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công ty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nguồn</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Lead Score</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => handleLeadSelect(lead)}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedLead?.id === lead.id ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                  <div className="text-sm text-gray-500">{lead.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{lead.company}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{lead.source}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      STATUS_COLORS[lead.status]
                        ? `bg-[${STATUS_COLORS[lead.status].bg}] text-[${STATUS_COLORS[lead.status].color}]`
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_COLORS[lead.status]?.label || lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    getLeadScoreColor(lead.leadScore)
                  }`}>
                    {lead.leadScore}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NBA Panel */}
      {selectedLead && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('crm.nextBestAction', 'Hành động tiếp theo')}: {selectedLead.firstName} {selectedLead.lastName}
            </h3>
            {nbaLoading && <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />}
          </div>

          {nba ? (
            <NBACard
              action={nba.action}
              priority={nba.priority}
              reason={nba.reason}
            />
          ) : (
            <p className="text-gray-500 text-center py-8">
              {nbaLoading ? 'Đang phân tích...' : 'Chọn lead để xem gợi ý'}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => fetchNBA(selectedLead.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t('actions.refresh', 'Làm mới')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}