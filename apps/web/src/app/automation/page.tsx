'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@smart-erp/shared';
import { Zap, Package, DollarSign, AlertTriangle, UserPlus, Clock, RefreshCw, FileText, Bell, Mail, Edit, BarChart3, Link, TrendingUp, Award, Play, Save, Trash2 } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';

interface DragItem {
  id: string;
  type: string;
  label: string;
  icon: string;
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  'order.created': <Package className="w-5 h-5" />,
  'payment.received': <DollarSign className="w-5 h-5" />,
  'inventory.low_stock': <AlertTriangle className="w-5 h-5" />,
  'customer.created': <UserPlus className="w-5 h-5" />,
  'scheduled.cron': <Clock className="w-5 h-5" />,
  'sync.completed': <RefreshCw className="w-5 h-5" />,
  'invoice.issued': <FileText className="w-5 h-5" />,
  'employee.late': <Clock className="w-5 h-5" />,
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_notification: <Bell className="w-5 h-5" />,
  send_email: <Mail className="w-5 h-5" />,
  update_field: <Edit className="w-5 h-5" />,
  create_report: <BarChart3 className="w-5 h-5" />,
  call_webhook: <Link className="w-5 h-5" />,
  update_lead_score: <TrendingUp className="w-5 h-5" />,
  issue_bonus: <Award className="w-5 h-5" />,
};

export default function AutomationBuilder() {
  const { t } = useTranslation('common');
  const [workflowName, setWorkflowName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [steps, setSteps] = useState<Array<{ id: string; type: string; label: string; config: Record<string, string> }>>([]);
  const [isActive, setIsActive] = useState(true);

  const triggers = [
    { key: 'order.created', label: 'Order Created' },
    { key: 'payment.received', label: 'Payment Received' },
    { key: 'inventory.low_stock', label: 'Low Stock' },
    { key: 'customer.created', label: 'New Customer' },
    { key: 'scheduled.cron', label: 'Scheduled' },
    { key: 'sync.completed', label: 'Sync Completed' },
    { key: 'invoice.issued', label: 'E-Invoice Issued' },
    { key: 'employee.late', label: 'Employee Late' },
  ];

  const actions = [
    { key: 'send_notification', label: 'Send Notification' },
    { key: 'send_email', label: 'Send Email' },
    { key: 'update_field', label: 'Update Field' },
    { key: 'create_report', label: 'Generate Report' },
    { key: 'call_webhook', label: 'Call Webhook' },
    { key: 'update_lead_score', label: 'Update Lead Score' },
    { key: 'issue_bonus', label: 'Issue Bonus/Penalty' },
  ];

  const addStep = (action: typeof actions[0]) => {
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), type: action.key, label: action.label, config: {} }]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    alert(t('automation.saveWorkflow') || 'Workflow saved');
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('automation.title')}
          description={t('automation.description')}
          icon={<Zap className="w-5 h-5" />}
          iconColor="yellow"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {isActive ? t('automation.enable') : t('automation.disable')}
              </button>
            </div>
          }
        />

        {/* Workflow Name */}
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow name"
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />

        {/* Trigger Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('automation.trigger')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {triggers.map((tr) => (
              <button
                key={tr.key}
                onClick={() => setSelectedTrigger(tr.key)}
                className={`p-3 rounded-lg border text-center transition ${
                  selectedTrigger === tr.key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex justify-center mb-1">{TRIGGER_ICONS[tr.key]}</div>
                <span className="text-xs">{tr.label}</span>
              </button>
            ))}
          </div>
          {selectedTrigger && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('automation.triggerEvent')}: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{selectedTrigger}</span>
            </p>
          )}
        </div>

        {/* Action Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('automation.action')}s</h3>
          {steps.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                  <div className="text-blue-500">{ACTION_ICONS[step.type]}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{step.label}</p>
                    <p className="text-xs text-gray-400">{t('automation.step')} {idx + 1}</p>
                  </div>
                  <button onClick={() => removeStep(step.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Action Buttons */}
          <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-2">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={() => addStep(action)}
                className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition text-xs text-gray-700 dark:text-gray-300"
              >
                <div className="flex justify-center mb-1 text-blue-500">{ACTION_ICONS[action.key]}</div>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {t('automation.saveWorkflow')}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
