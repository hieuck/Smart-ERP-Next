'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Link2, Loader2, Upload, X } from 'lucide-react';
import { productsApi, resolveProductImageUrl } from '@/lib/api-products';
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageFile,
  validateProductImageUrl,
} from './ProductImageInput.logic';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

interface ProductImageInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProductImageInput({ value, onChange, disabled = false }: ProductImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    const validationError = validateProductImageFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const uploaded = await productsApi.uploadImage(file);
      onChange(uploaded.imageUrl);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[132px_1fr]">
        <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          {value ? (
            <Image src={resolveProductImageUrl(value)} alt="Ảnh sản phẩm" fill sizes="128px" className="object-cover" unoptimized />
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-300" />
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="imageUrl"
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value;
                const validationError = validateProductImageUrl(nextValue);
                setError(validationError);
                if (!validationError) {
                  onChange(nextValue);
                }
              }}
              disabled={disabled || uploading}
              placeholder="https://example.com/product.jpg hoặc tải ảnh từ thiết bị"
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Đang tải lên...' : 'Tải ảnh từ thiết bị'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={disabled || uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
                Xóa ảnh
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={PRODUCT_IMAGE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-gray-400">Hỗ trợ JPG, PNG, WEBP, GIF. Tối đa {PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024}MB.</p>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
