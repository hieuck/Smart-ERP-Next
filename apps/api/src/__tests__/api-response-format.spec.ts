import { of } from 'rxjs';
import { ResponseFormatInterceptor } from '../common/interceptors/response-format.interceptor';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ResponseFormatInterceptor', () => {
  it('wraps successful responses in { success, data, requestId }', (done) => {
    const interceptor = new ResponseFormatInterceptor();
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'req-123' }),
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
      requestId: 'req-3',
    });
  });
});
