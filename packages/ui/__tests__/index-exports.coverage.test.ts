jest.mock('../src/components/Button', () => ({ Button: 'Button' }));
jest.mock('../src/components/ThemeProvider', () => ({ ThemeProvider: 'ThemeProvider', useTheme: jest.fn() }));
jest.mock('../src/components/AppShell', () => ({ AppShell: 'AppShell' }));
jest.mock('../src/components/Sidebar', () => ({ Sidebar: 'Sidebar' }));
jest.mock('../src/components/DataTable', () => ({ DataTable: 'DataTable' }));
jest.mock('../src/components/Pagination', () => ({ Pagination: 'Pagination' }));
jest.mock('../src/components/Card', () => ({ Card: 'Card', CardHeader: 'CardHeader', CardTitle: 'CardTitle', CardContent: 'CardContent' }));
jest.mock('../src/components/Badge', () => ({ Badge: 'Badge' }));
jest.mock('../src/components/StatCard', () => ({ StatCard: 'StatCard' }));
jest.mock('../src/components/Toast', () => ({ Toast: 'Toast', ToastContainer: 'ToastContainer' }));
jest.mock('../src/components/ConfirmDialog', () => ({ ConfirmDialog: 'ConfirmDialog' }));

import * as ui from '../src';

describe('ui package index exports', () => {
  it('re-exports component APIs and utilities', () => {
    expect([
      ui.Button,
      ui.ThemeProvider,
      ui.useTheme,
      ui.AppShell,
      ui.Sidebar,
      ui.DataTable,
      ui.Pagination,
      ui.Card,
      ui.CardHeader,
      ui.CardTitle,
      ui.CardContent,
      ui.Badge,
      ui.StatCard,
      ui.Toast,
      ui.ToastContainer,
      ui.ConfirmDialog,
      ui.cn,
    ]).toEqual([
      'Button',
      'ThemeProvider',
      expect.any(Function),
      'AppShell',
      'Sidebar',
      'DataTable',
      'Pagination',
      'Card',
      'CardHeader',
      'CardTitle',
      'CardContent',
      'Badge',
      'StatCard',
      'Toast',
      'ToastContainer',
      'ConfirmDialog',
      expect.any(Function),
    ]);
  });
});
