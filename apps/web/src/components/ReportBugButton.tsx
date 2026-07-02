'use client';

import { useState } from 'react';
import { Bug } from 'lucide-react';

const GITHUB_ISSUES_URL = 'https://github.com/hieuck/Smart-ERP-Next/issues/new';

export default function ReportBugButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 dark:bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition"
        title="Report a bug"
      >
        <Bug size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Report a Bug
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Found something wrong? Let us know on GitHub.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(GITHUB_ISSUES_URL, '_blank')}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition text-sm font-medium"
              >
                Open GitHub Issue
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
