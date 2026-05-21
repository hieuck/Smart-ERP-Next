'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface Column<T> {
  key?: string;
  title?: React.ReactNode;
  label?: React.ReactNode;
  header?: React.ReactNode;
  dataIndex?: keyof T;
  accessor?: keyof T | ((record: T, index: number) => React.ReactNode);
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey?: keyof T | ((record: T) => string);
  loading?: boolean;
  emptyText?: string;
  emptyMessage?: string;
  onRowClick?: (record: T) => void;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = 'Không có dữ liệu',
  emptyMessage,
  onRowClick,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(record);
    if (rowKey) return String(record[rowKey] ?? index);

    const candidate = record as Record<string, unknown>;
    return String(candidate.id ?? candidate.uuid ?? candidate.code ?? index);
  };

  const getColumnKey = (col: Column<T>, index: number): string => {
    if (col.key) return col.key;
    if (col.dataIndex) return `${String(col.dataIndex)}-${index}`;
    if (typeof col.accessor === 'string') return `${col.accessor}-${index}`;
    return `column-${index}`;
  };

  const getColumnTitle = (col: Column<T>): React.ReactNode => {
    if (col.title !== undefined) return col.title;
    if (col.header !== undefined) return col.header;
    if (col.label !== undefined) return col.label;
    if (col.key) return col.key;
    if (col.dataIndex) return String(col.dataIndex);
    if (typeof col.accessor === 'string') return col.accessor;
    return '';
  };

  const getCellValue = (record: T, col: Column<T>, index: number): React.ReactNode => {
    if (col.render) {
      const value = col.dataIndex
        ? record[col.dataIndex]
        : typeof col.accessor === 'string'
          ? record[col.accessor]
          : undefined;
      return col.render(value, record, index);
    }

    if (typeof col.accessor === 'function') return col.accessor(record, index);
    if (typeof col.accessor === 'string') return record[col.accessor] as React.ReactNode;
    if (col.dataIndex) return record[col.dataIndex] as React.ReactNode;
    if (col.key) return (record as Record<string, unknown>)[col.key] as React.ReactNode;

    return '';
  };

  const normalizeCellContent = (content: React.ReactNode): React.ReactNode => {
    if (Array.isArray(content)) return React.Children.toArray(content);
    return content;
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead className={cn('bg-gray-50 dark:bg-gray-700', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {columns.map((col, index) => {
              const columnKey = getColumnKey(col, index);
              return (
                <th
                  key={columnKey}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    !col.align && 'text-left',
                    col.className
                  )}
                >
                  {getColumnTitle(col)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Đang tải...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                {emptyMessage ?? emptyText}
              </td>
            </tr>
          ) : (
            data.map((record, index) => (
              <tr
                key={getRowKey(record, index)}
                onClick={() => onRowClick?.(record)}
                className={cn(
                  'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, colIndex) => {
                  const columnKey = getColumnKey(col, colIndex);
                  return (
                    <td
                      key={columnKey}
                      className={cn(
                        'px-4 py-3 text-gray-900 dark:text-gray-100',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {normalizeCellContent(getCellValue(record, col, index)) ?? ''}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
