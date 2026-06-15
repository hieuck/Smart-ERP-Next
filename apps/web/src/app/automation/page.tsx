// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@smart-erp/shared';
import { Zap } from 'lucide-react';

interface DragItem {
  id: string;
  type: string;
  label: string;
  icon: string;
}

export default function AutomationBuilder() {
  const { t } = useTranslation('common');
  const [workflowName, setWorkflowName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [steps, setSteps] = useState<Array<{ id: string; type: string; icon: string; label: string; config: Record<string, string> }>>([]);
  const [isActive, setIsActive] = useState(true);

  const triggers = [
    { key: 'order.created', label: 'Order Created', icon: '📦' },
    { key: 'payment.received', label: 'Payment Received', icon: '💰' },
    { key: 'inventory.low_stock', label: 'Low Stock', icon: '⚠️' },
    { key: 'customer.created', label: 'New Customer', icon: '👤' },
    { key: 'scheduled.cron', label: 'Scheduled', icon: '⏰' },
    { key: 'sync.completed', label: 'Sync Completed', icon: '🔄' },
    { key: 'invoice.issued', label: 'E-Invoice Issued', icon: '🧾' },
    { key: 'employee.late', label: 'Employee Late', icon: '🏃' },
  ];

  const actions = [
    { key: 'send_notification', label: 'Send Notification', icon: '🔔' },
    { key: 'send_email', label: 'Send Email', icon: '📧' },
    { key: 'update_field', label: 'Update Field', icon: 'âœï¸' },
    { key: 'create_report', label: 'Generate Report', icon: 'ðŸ“Š' },
    { key: 'call_webhook', label: 'Call Webhook', icon: 'ðŸ”—' },
    { key: 'update_lead_score', label: 'Update Lead Score', icon: 'ðŸŽ¯' },
    { key: 'issue_bonus', label: 'Issue Bonus/Penalty', icon: 'ðŸ’¸' },
  ];

  const addStep = (action: typeof actions[0]) => {
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: action.key,
        icon: action.icon,
        label: action.label,
        config: {},
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    // Placeholder: would call POST /automation
    alert(t('automation.saveWorkflow') || 'Workflow saved');
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('automation.title')}
        description={t('automation.description') || 'Build automated workflows with triggers and actions'}
        icon={<Zap className="w-5 h-5" />}
        iconColor="yellow"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{isActive ? 'ðŸŸ¢' : 'ðŸ”´'}</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1 rounded text-sm ${
                isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
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
        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Trigger Selection */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <h3 className="font-semibold mb-3">ðŸŽ¯ {t('automation.trigger')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {triggers.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setSelectedTrigger(tr.key)}
              className={`p-3 rounded-lg border text-center transition ${
                selectedTrigger === tr.key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <span className="text-2xl block mb-1">{tr.icon}</span>
              <span className="text-sm">{tr.label}</span>
            </button>
          ))}
        </div>
        {selectedTrigger && (
          <p className="text-sm text-gray-500 mt-2">
            {t('automation.triggerEvent')}: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{selectedTrigger}</span>
          </p>
        )}
      </div>

      {/* Action Steps */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <h3 className="font-semibold mb-3">âš™ï¸ {t('automation.action')}s</h3>
        {steps.length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t('common.noData')}</p>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <span className="text-lg">{step.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.label}</p>
                  <p className="text-xs text-gray-400">Step {idx + 1}</p>
                </div>
                <button
                  onClick={() => removeStep(step.id)}
                  className="text-red-400 hover:text-red-600 text-lg"
                >
                  âœ•
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Action Buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => addStep(action)}
              className="p-2 border rounded-lg text-center hover:bg-gray-50 transition text-sm"
            >
              <span className="block text-lg mb-1">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          ðŸ’¾ {t('automation.saveWorkflow')}
        </button>
      </div>
    </div>
  );
}
