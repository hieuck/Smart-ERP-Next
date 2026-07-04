import { of } from 'rxjs';
import { ResponseFormatInterceptor } from '../common/interceptors/response-format.interceptor';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ResponseFormatInterceptor', () => {
  it('wraps successful responses in { success, data, requestId } and sets safe JSON headers', (done) => {
    const interceptor = new ResponseFormatInterceptor();
    const mockSetHeader = jest.fn();
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'req-123', originalUrl: '/api/v1/products' }),
        getResponse: () => ({ setHeader: mockSetHeader, headersSent: false }),
      }),
    } as any;
    interceptor
      .intercept(mockContext, { handle: () => of({ items: [] }) } as any)
      .subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: { items: [] },
            requestId: 'req-123',
          });
          expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
          expect(mockSetHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
          done();
        },
      });
  });
});

describe('GlobalExceptionFilter', () => {
  it('formats HttpException as { success, data, error }', () => {
    const filter = new GlobalExceptionFilter();
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ requestId: 'req-1' }),
      }),
    } as any;

    filter.catch(new HttpException('Test error', HttpStatus.BAD_REQUEST), mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: 'Test error',
      errorCode: 'VALIDATION_ERROR',
      requestId: 'req-1',
    });
  });

  it('formats unknown errors as 500', () => {
    const filter = new GlobalExceptionFilter();
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ requestId: 'req-2' }),
      }),
    } as any;

    filter.catch(new Error('Unexpected'), mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      requestId: 'req-2',
    });
  });

  it('extracts nested message from HttpException response object', () => {
    const filter = new GlobalExceptionFilter();
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ requestId: 'req-3' }),
      }),
    } as any;

    filter.catch(
      new HttpException({ message: 'Validation failed', errors: [] }, HttpStatus.UNPROCESSABLE_ENTITY),
      mockHost,
    );

    expect(mockStatus).toHaveBeenCalledWith(422);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      requestId: 'req-3',
    });
  });
});
