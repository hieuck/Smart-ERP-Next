import { CurrenciesController } from './currencies.controller';

describe('CurrenciesController coverage', () => {
  let svc: any;
  let ctrl: CurrenciesController;

  beforeEach(() => {
    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getBaseCurrency: jest.fn(),
      convertAmount: jest.fn(),
      getExchangeRates: jest.fn(),
      getExchangeRate: jest.fn(),
      createExchangeRate: jest.fn(),
      updateExchangeRate: jest.fn(),
      removeExchangeRate: jest.fn(),
    };
    ctrl = new CurrenciesController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('create delegates to service', async () => {
    svc.create.mockResolvedValue({ id: 'c1' });
    const dto = { code: 'USD', name: 'US Dollar', symbol: '$' } as any;
    const r = await ctrl.create(req, dto);
    expect(svc.create).toHaveBeenCalledWith('t1', dto);
    expect(r).toEqual({ id: 'c1' });
  });

  it('findAll delegates to service', async () => {
    svc.findAll.mockResolvedValue([{ id: 'c1' }]);
    const r = await ctrl.findAll(req);
    expect(svc.findAll).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ id: 'c1' }]);
  });

  it('getBase delegates to service', async () => {
    svc.getBaseCurrency.mockResolvedValue({ id: 'c1', isBaseCurrency: true });
    const r = await ctrl.getBase(req);
    expect(svc.getBaseCurrency).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ id: 'c1', isBaseCurrency: true });
  });

  it('convert delegates to service', async () => {
    svc.convertAmount.mockResolvedValue(50000);
    const r = await ctrl.convert(req, 'USD', 'VND', '2', '2026-05-21');
    expect(svc.convertAmount).toHaveBeenCalledWith('t1', 2, 'USD', 'VND', '2026-05-21');
    expect(r).toBe(50000);
  });

  it('getExchangeRates delegates to service', async () => {
    svc.getExchangeRates.mockResolvedValue([]);
    const r = await ctrl.getExchangeRates(req, 'USD');
    expect(svc.getExchangeRates).toHaveBeenCalledWith('t1', 'USD');
    expect(r).toEqual([]);
  });

  it('getExchangeRate delegates to service', async () => {
    svc.getExchangeRate.mockResolvedValue({ rate: '25000' });
    const r = await ctrl.getExchangeRate(req, 'USD', 'VND', '2026-05-21');
    expect(svc.getExchangeRate).toHaveBeenCalledWith('t1', 'USD', 'VND', '2026-05-21');
    expect(r).toEqual({ rate: '25000' });
  });

  it('findOne delegates to service', async () => {
    svc.findOne.mockResolvedValue({ id: 'c1' });
    const r = await ctrl.findOne(req, 'c1');
    expect(svc.findOne).toHaveBeenCalledWith('t1', 'c1');
    expect(r).toEqual({ id: 'c1' });
  });

  it('update delegates to service', async () => {
    svc.update.mockResolvedValue({ id: 'c1' });
    const dto = { name: 'Updated' } as any;
    const r = await ctrl.update(req, 'c1', dto);
    expect(svc.update).toHaveBeenCalledWith('t1', 'c1', dto);
    expect(r).toEqual({ id: 'c1' });
  });

  it('remove delegates to service', async () => {
    svc.remove.mockResolvedValue({ success: true });
    const r = await ctrl.remove(req, 'c1');
    expect(svc.remove).toHaveBeenCalledWith('t1', 'c1');
    expect(r).toEqual({ success: true });
  });

  it('createExchangeRate delegates to service', async () => {
    svc.createExchangeRate.mockResolvedValue({ id: 'r1' });
    const dto = { fromCurrency: 'USD', toCurrency: 'VND', rate: 25000 } as any;
    const r = await ctrl.createExchangeRate(req, dto);
    expect(svc.createExchangeRate).toHaveBeenCalledWith('t1', dto);
    expect(r).toEqual({ id: 'r1' });
  });

  it('updateExchangeRate delegates to service', async () => {
    svc.updateExchangeRate.mockResolvedValue({ id: 'r1' });
    const dto = { rate: 26000 } as any;
    const r = await ctrl.updateExchangeRate(req, 'r1', dto);
    expect(svc.updateExchangeRate).toHaveBeenCalledWith('t1', 'r1', dto);
    expect(r).toEqual({ id: 'r1' });
  });

  it('removeExchangeRate delegates to service', async () => {
    svc.removeExchangeRate.mockResolvedValue({ success: true });
    const r = await ctrl.removeExchangeRate(req, 'r1');
    expect(svc.removeExchangeRate).toHaveBeenCalledWith('t1', 'r1');
    expect(r).toEqual({ success: true });
  });
});
