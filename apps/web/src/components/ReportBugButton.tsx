'use client';

import { useState, useCallback } from 'react';
import { Bug, Loader2 } from 'lucide-react';

export default function ReportBugButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const buildBody = useCallback(() => {
    const lines = [
      `## Mô tả lỗi\n${description || '(không có mô tả)'}\n`,
      '## Thông tin hệ thống',
      `- URL: ${window.location.href}`,
      `- User Agent: ${navigator.userAgent}`,
      `- Platform: ${navigator.platform}`,
      `- Ngôn ngữ: ${navigator.language}`,
      `- Online: ${navigator.onLine}`,
      `- Screen: ${window.screen.width}x${window.screen.height}`,
      `- Timestamp: ${new Date().toISOString()}`,
      '',
      '## Console errors (last 10)',
    ];
    // Capture console errors
    if ((window as any).__CAPTURED_ERRORS?.length) {
      (window as any).__CAPTURED_ERRORS.slice(-10).forEach((e: string) => lines.push(`- \`${e}\``));
    } else {
      lines.push('(none captured)');
    }
    return lines.join('\n');
  }, [description]);

  const submit = async () => {
    setSubmitting(true);
    const body = buildBody();
    const url = `https://github.com/hieuck/Smart-ERP-Next/issues/new?title=${encodeURIComponent(title || 'Bug report')}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    setSubmitting(false);
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setTitle(''); setDescription(''); }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 dark:bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition hover:scale-110 active:scale-95"
        title="Report a bug"
      >
        <Bug size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            {done ? (
              <div className="text-center py-6">
                <div className="text-green-500 text-4xl mb-3">✓</div>
                <p className="text-gray-900 dark:text-white font-medium">Cảm ơn bạn!</p>
                <p className="text-sm text-gray-500 mt-1">GitHub Issues đã được mở.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Báo cáo lỗi
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tiêu đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ví dụ: Không thể tạo đơn hàng mới"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mô tả
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Điều gì đã xảy ra? Bạn đang làm gì trước đó?"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Thông tin tự động gửi kèm: URL trang, trình duyệt, kích thước màn hình, log lỗi.
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={submit}
                    disabled={!title.trim() || submitting}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    Gửi báo cáo
                  </button>
                  <button
                    onClick={() => { setOpen(false); setTitle(''); setDescription(''); }}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-medium"
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
