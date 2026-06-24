import { ExchangeRateController } from './exchange-rate.controller';

describe('ExchangeRateController coverage', () => {
  let svc: any;
  let ctrl: ExchangeRateController;

  beforeEach(() => {
    svc = {
      fetchRate: jest.fn(),
      convert: jest.fn(),
      getSupportedCurrencies: jest.fn(),
    };
    ctrl = new ExchangeRateController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('getRate delegates to service', async () => {
    svc.fetchRate.mockResolvedValue({ rate: 25000 });
    const r = await ctrl.getRate(req, 'USD', 'VND');
    expect(svc.fetchRate).toHaveBeenCalledWith('USD', 'VND');
    expect(r).toEqual({ rate: 25000 });
  });

  it('getRate uses defaults when params omitted', async () => {
    svc.fetchRate.mockResolvedValue({ rate: 1 });
    const r = await ctrl.getRate(req, undefined as any, undefined as any);
    expect(svc.fetchRate).toHaveBeenCalledWith('VND', 'USD');
  });

  it('convert delegates to service', async () => {
    svc.convert.mockResolvedValue(50000);
    const body = { amount: 100, from: 'USD', to: 'VND' };
    const r = await ctrl.convert(req, body);
    expect(svc.convert).toHaveBeenCalledWith(100, 'USD', 'VND', 't1');
    expect(r).toBe(50000);
  });

  it('getSupported delegates to service', async () => {
    svc.getSupportedCurrencies.mockResolvedValue(['USD', 'VND', 'EUR']);
    const r = await ctrl.getSupported();
    expect(svc.getSupportedCurrencies).toHaveBeenCalledWith();
    expect(r).toEqual(['USD', 'VND', 'EUR']);
  });
});
