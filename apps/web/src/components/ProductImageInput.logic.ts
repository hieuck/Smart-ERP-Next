export const PRODUCT_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateProductImageFile(file?: Pick<File, 'size' | 'type'> | null): string {
  if (!file) return '';
  if (!file.type.startsWith('image/')) return 'Vui lòng chọn file ảnh.';
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return 'Ảnh phải nhỏ hơn 5MB.';
  return '';
}

export function validateProductImageUrl(url?: string | null): string {
  if (!url) return '';

  // Allow absolute HTTP(S) URLs and protocol-relative URLs.
  if (/^https?:\/\//i.test(url) || /^\/\//i.test(url)) {
    return '';
  }

  // Allow same-origin relative paths.
  if (url.startsWith('/')) {
    return '';
  }

  return 'URL ảnh không hợp lệ.';
}
