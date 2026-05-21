import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { I18nInterceptor } from './i18n.interceptor';

describe('I18nInterceptor coverage', () => {
  const i18n = { t: jest.fn((key: string, locale: string) => `${locale}:${key}`) };
  const context = (acceptLanguage?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'accept-language': acceptLanguage } }),
      }),
    }) as any;
  const interceptor = new I18nInterceptor(i18n as any);

  beforeEach(() => jest.clearAllMocks());

  it('translates BadRequest validation messages with accepted locale', async () => {
    const next = {
      handle: () => throwError(() => new BadRequestException(['name.required', 'price.invalid'])),
    };

    await expect(lastValueFrom(interceptor.intercept(context('en-US,en;q=0.8'), next as any))).rejects.toMatchObject({
      response: { message: ['en-US:name.required', 'en-US:price.invalid'] },
    });
  });

  it('keeps non-validation errors unchanged and defaults locale to Vietnamese', async () => {
    const original = new Error('boom');
    await expect(
      lastValueFrom(interceptor.intercept(context(), { handle: () => throwError(() => original) } as any)),
    ).rejects.toBe(original);

    await expect(
      lastValueFrom(
        interceptor.intercept(context(), {
          handle: () => throwError(() => new BadRequestException({ message: 'plain' })),
        } as any),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(i18n.t).not.toHaveBeenCalledWith('plain', 'vi');
  });
});
