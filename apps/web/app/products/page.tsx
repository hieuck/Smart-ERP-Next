'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useTranslation } from '@smart-erp/i18n/react';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial products
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setLoading(false);
      });

    // Connect to WebSocket
    const socket = io('/notifications', {
      path: '/api/socket.io',
    });

    socket.on('product.created', (product: Product) => {
      setProducts(prev => [...prev, product]);
    });

    socket.on('product.updated', (updated: Product) => {
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    });

    socket.on('product.deleted', ({ id }: { id: string }) => {
      setProducts(prev => prev.filter(p => p.id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) return <div>{t('loading')}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('products.title')}</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">{t('products.name')}</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">{t('products.price')}</th>
            <th className="border p-2">{t('products.stock')}</th>
            <th className="border p-2">{t('products.status')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td className="border p-2">{product.name}</td>
              <td className="border p-2">{product.sku}</td>
              <td className="border p-2">{product.price.toLocaleString()} ₫</td>
              <td className="border p-2">{product.stock}</td>
              <td className="border p-2">
                {product.isActive ? t('active') : t('inactive')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
