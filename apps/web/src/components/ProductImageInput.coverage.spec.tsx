/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProductImageInput } from './ProductImageInput';
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageFile,
  validateProductImageUrl,
} from './ProductImageInput.logic';

const mockUploadImage = jest.fn();
jest.mock('@/lib/api-products', () => ({
  productsApi: { uploadImage: (...args: any[]) => mockUploadImage(...args) },
  resolveProductImageUrl: (imageUrl: string) =>
    imageUrl.startsWith('/') ? `http://api.test${imageUrl}` : imageUrl,
}));

describe('ProductImageInput coverage', () => {
  it('validates product image files before upload', () => {
    expect(validateProductImageFile()).toBe('');
    expect(validateProductImageFile({ size: 10, type: 'text/plain' } as File)).toBe(
      'Vui lòng chọn file ảnh.',
    );
    expect(validateProductImageFile({ size: PRODUCT_IMAGE_MAX_BYTES + 1, type: 'image/png' } as File)).toBe(
      'Ảnh phải nhỏ hơn 5MB.',
    );
    expect(validateProductImageFile({ size: PRODUCT_IMAGE_MAX_BYTES, type: 'image/webp' } as File)).toBe('');
  });

  it('renders upload controls, accepted image types, and empty preview state', () => {
    render(<ProductImageInput value="" onChange={jest.fn()} />);
    expect(screen.getByText('Tải ảnh từ thiết bị')).toBeInTheDocument();
    expect(screen.getByText(/Hỗ trợ JPG, PNG/)).toBeInTheDocument();
    expect(screen.queryByText('Xóa ảnh')).not.toBeInTheDocument();
  });

  it('renders an existing uploaded image and remove action', () => {
    render(<ProductImageInput value="/uploads/products/tenant/product.png" onChange={jest.fn()} />);
    expect(screen.getByAltText('Ảnh sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Xóa ảnh')).toBeInTheDocument();
  });

  it('disables controls when the parent form is disabled', () => {
    render(<ProductImageInput value="" onChange={jest.fn()} disabled />);
    expect(screen.getByPlaceholderText(/https:\/\/example\.com/)).toBeDisabled();
    expect(screen.getByText('Tải ảnh từ thiết bị').closest('button')).toBeDisabled();
  });

  it('calls onChange when URL is typed into the text input', () => {
    const onChange = jest.fn();
    render(<ProductImageInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com/), {
      target: { value: 'https://example.com/img.jpg' },
    });
    expect(onChange).toHaveBeenCalledWith('https://example.com/img.jpg');
  });

  it('calls onChange with empty string when remove button is clicked', () => {
    const onChange = jest.fn();
    render(<ProductImageInput value="http://api.test/img.png" onChange={onChange} />);
    fireEvent.click(screen.getByText('Xóa ảnh'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('calls uploadImage and onChange on valid file selection', async () => {
    mockUploadImage.mockResolvedValueOnce({ imageUrl: '/uploads/products/new.png' });
    const onChange = jest.fn();
    const { container } = render(<ProductImageInput value="" onChange={onChange} />);
    const fileInput = container.querySelector('input[type="file"]')!;
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['dummy'], 'test.png', { type: 'image/png' })] } });
    });
    expect(mockUploadImage).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('/uploads/products/new.png');
  });

  it('shows error when upload API fails', async () => {
    mockUploadImage.mockRejectedValueOnce({ response: { data: { message: 'Server error' } } });
    const { container } = render(<ProductImageInput value="" onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.change(container.querySelector('input[type="file"]')!, {
        target: { files: [new File(['dummy'], 'test.png', { type: 'image/png' })] },
      });
    });
    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });

  it('shows upload error fallback when API error has no message', async () => {
    mockUploadImage.mockRejectedValueOnce(new Error('network failure'));
    const { container } = render(<ProductImageInput value="" onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.change(container.querySelector('input[type="file"]')!, {
        target: { files: [new File(['x'], 'x.png', { type: 'image/png' })] },
      });
    });
    expect(await screen.findByText('Không thể tải ảnh lên.')).toBeInTheDocument();
  });

  it('shows uploading spinner during upload', async () => {
    let resolveUpload: (value: any) => void;
    mockUploadImage.mockReturnValueOnce(new Promise((resolve) => { resolveUpload = resolve; }));
    const { container } = render(<ProductImageInput value="" onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.change(container.querySelector('input[type="file"]')!, {
        target: { files: [new File(['dummy'], 'test.png', { type: 'image/png' })] },
      });
    });
    expect(await screen.findByText('Đang tải lên...')).toBeInTheDocument();
    resolveUpload!({ imageUrl: '/uploads/products/done.png' });
  });

  it('rejects non-HTTP/relative image URLs and accepts safe ones', () => {
    expect(validateProductImageUrl('')).toBe('');
    expect(validateProductImageUrl('https://example.com/img.jpg')).toBe('');
    expect(validateProductImageUrl('http://example.com/img.jpg')).toBe('');
    expect(validateProductImageUrl('/uploads/products/tenant/img.png')).toBe('');
    expect(validateProductImageUrl('//cdn.example.com/img.jpg')).toBe('');
    expect(validateProductImageUrl('javascript:alert(1)')).toBe('URL ảnh không hợp lệ.');
    expect(validateProductImageUrl('data:image/png;base64,abc')).toBe('URL ảnh không hợp lệ.');
    expect(validateProductImageUrl('blob:https://example.com/uuid')).toBe('URL ảnh không hợp lệ.');
    expect(validateProductImageUrl('ftp://example.com/img.jpg')).toBe('URL ảnh không hợp lệ.');
  });

  it('does not call onChange and shows error when an invalid URL is typed', () => {
    const onChange = jest.fn();
    render(<ProductImageInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com/), {
      target: { value: 'javascript:alert(1)' },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('URL ảnh không hợp lệ.')).toBeInTheDocument();
  });

  it('calls onChange when a valid URL is typed', () => {
    const onChange = jest.fn();
    render(<ProductImageInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com/), {
      target: { value: 'https://example.com/img.jpg' },
    });
    expect(onChange).toHaveBeenCalledWith('https://example.com/img.jpg');
  });
});