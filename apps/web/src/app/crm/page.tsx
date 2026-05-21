// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiPhone, FiMail, FiTarget, FiDollarSign } from 'react-icons/fi';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Button, Badge } from '@smart-erp/ui';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  estimatedValue: string;
  score: number;
}

const COLUMNS = [
  { id: 'new', title: 'Khách mới (New)' },
  { id: 'contacted', title: 'Đã liên hệ (Contacted)' },
  { id: 'qualified', title: 'Đánh giá (Qualified)' },
  { id: 'proposal', title: 'Báo giá (Proposal)' },
  { id: 'won', title: 'Chốt thành công (Won)' },
];

export default function CrmPage() {
  const { t } = useTranslation('common');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await apiClient.get<Lead[]>('/crm/leads');
      setLeads(res.data);
    } catch (e) {
      // ignore
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMockLead = async () => {
    try {
      await apiClient.post('/crm/leads', {
        name: `Khách hàng ${Math.floor(Math.random() * 1000)}`,
        company: 'Công ty Đối tác',
        phone: '0901234567',
        estimatedValue: Math.floor(Math.random() * 50) * 1000000,
        score: Math.floor(Math.random() * 100),
      });
      fetchLeads();
    } catch (e) {
      // ignore
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l));
    try {
      await apiClient.patch(`/crm/leads/${leadId}/status`, { status: newStatus });
    } catch (e) {
      fetchLeads(); // rollback if error
    }
  };

  const formatCurrency = (val: string | number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));

  return (
    <AuthGuard>
      <div className="h-full flex flex-col space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiTarget className="text-blue-500" /> CRM & Sales Pipeline
            </h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý Khách hàng tiềm năng & Hành trình chốt Sale</p>
          </div>
          <Button variant="default"  onClick={handleCreateMockLead}>
            Thêm Khách (Mock)
          </Button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => {
              const colLeads = leads.filter(l => l.status === col.id);
              const totalValue = colLeads.reduce((acc, l) => acc + Number(l.estimatedValue || 0), 0);

              return (
                <div 
                  key={col.id} 
                  className="w-80 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl p-3 h-full"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedLeadId) {
                      updateLeadStatus(draggedLeadId, col.id);
                      setDraggedLeadId(null);
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                      {col.title} <span className="text-sm font-normal text-gray-400">({colLeads.length})</span>
                    </h3>
                  </div>
                  
                  <div className="text-xs font-bold text-gray-400 mb-3 px-1">
                    {formatCurrency(totalValue)}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {colLeads.map(lead => (
                      <div 
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedLeadId(lead.id)}
                        className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing border border-transparent hover:border-blue-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-800 dark:text-white">{lead.name}</h4>
                          <Badge variant={lead.score > 80 ? 'success' : lead.score > 50 ? 'warning' : 'default'}>
                            Điểm: {lead.score}
                          </Badge>
                        </div>
                        
                        {lead.company && <p className="text-xs text-gray-500 mb-2">{lead.company}</p>}

                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1"><FiPhone /> {lead.phone || 'N/A'}</div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-400">Giá trị</span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <FiDollarSign size={12} />
                            {Number(lead.estimatedValue).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

