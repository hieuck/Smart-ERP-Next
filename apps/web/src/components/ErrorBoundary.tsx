'use client';

import { Component } from 'react';

export class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Co loi xay ra</h2>
            <p className="text-sm text-gray-500 mb-4">Trang nay khong the hien thi. Vui long thu lai.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Tai lai trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
