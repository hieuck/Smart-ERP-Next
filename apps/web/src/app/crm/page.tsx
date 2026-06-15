'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Phone, DollarSign } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@smart-erp/shared';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  leadScore: number;
}

const COLUMNS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;

const STATUS_COLORS: Record<string, string> = {
  new: 'border-l-blue-400',
  contacted: 'border-l-yellow-400',
  qualified: 'border-l-purple-400',
  proposal: 'border-l-orange-400',
  won: 'border-l-emerald-400',
  lost: 'border-l-red-400',
};

export default function CrmPage() {
  const { t } = useTranslation('common');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Lead[] | { items: Lead[] }>('/crm/leads');
      setLeads(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l));
    try {
      await apiClient.patch(`/crm/leads/${leadId}`, { status: newStatus });
    } catch {
      fetchLeads();
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('crm.title')}
          description={t('crm.subtitle')}
          icon={<Target className="w-5 h-5" />}
          iconColor="blue"
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Target className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{t('crm.noLeads')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('crm.noLeadsDesc')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 h-full min-w-max">
              {COLUMNS.map(col => {
                const colLeads = leads.filter(l => l.status === col);
                const totalScore = colLeads.reduce((acc, l) => acc + Number(l.leadScore || 0), 0);

                return (
                  <div
                    key={col}
                    className="w-72 flex flex-col bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 h-full"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedLeadId) { updateLeadStatus(draggedLeadId, col); setDraggedLeadId(null); }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                        {t(`crm.${col}`)} <span className="text-xs font-normal text-gray-400">({colLeads.length})</span>
                      </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {colLeads.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">{t('crm.dragHint')}</p>
                      ) : colLeads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => setDraggedLeadId(lead.id)}
                          className={`bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing border-l-4 ${STATUS_COLORS[lead.status] || 'border-l-gray-300'} hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                              {lead.firstName} {lead.lastName}
                            </h4>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              lead.leadScore > 80 ? 'bg-emerald-100 text-emerald-700' :
                              lead.leadScore > 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {lead.leadScore}
                            </span>
                          </div>

                          {lead.company && (
                            <p className="text-xs text-gray-500 mb-2">{lead.company}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {lead.phone && (
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                            )}
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{lead.leadScore}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
