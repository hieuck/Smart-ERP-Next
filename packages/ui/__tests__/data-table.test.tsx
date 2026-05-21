import * as React from 'react';
import { DataTable } from '../src/components/DataTable';

const getRawChildren = (element: React.ReactElement): any[] => {
  const children = (element.props as any).children;
  return Array.isArray(children) ? children : [children];
};

describe('DataTable', () => {
  it('derives stable React keys for legacy header/accessor columns', () => {
    const table = DataTable({
      columns: [
        { header: 'Số hóa đơn', accessor: (row: any) => row.invoiceNumber },
        { header: 'Người mua', accessor: 'buyerName' },
      ],
      data: [{ id: 'invoice-1', invoiceNumber: '000001', buyerName: 'Công ty A' }],
      rowKey: 'id',
    } as any) as React.ReactElement;

    const [tableElement] = getRawChildren(table);
    const [thead, tbody] = getRawChildren(tableElement);
    const [headerRow] = getRawChildren(thead);
    const headerCells = getRawChildren(headerRow);
    const [bodyRow] = getRawChildren(tbody);
    const bodyCells = getRawChildren(bodyRow);

    expect(headerCells.map((cell) => cell.key)).toEqual([
      'column-0',
      'buyerName-1',
    ]);
    expect(bodyCells.map((cell) => cell.key)).toEqual([
      'column-0',
      'buyerName-1',
    ]);
  });
});
