"use client";

import * as React from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG = {
  danger: {
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    btn: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    btn: "bg-yellow-600 hover:bg-yellow-700",
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    btn: "bg-blue-600 hover:bg-blue-700",
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const config = VARIANT_CONFIG[variant];

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {title}
              </h3>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm text-white font-bold transition",
              config.btn,
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
