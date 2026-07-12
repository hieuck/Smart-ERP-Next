import { CashflowController } from '../analytics/cashflow.controller';
import { ChurnController } from '../analytics/churn.controller';
import { ClvController } from '../analytics/clv.controller';
import { ForecastController } from '../analytics/forecast.controller';
import { PredictiveAnalyticsController } from '../analytics/predictive-analytics.controller';
import { ManufacturingController } from '../manufacturing/manufacturing.controller';
import { BenchmarksController } from '../modules/metrics/benchmarks.controller';
import { QmsController } from '../qms/qms.controller';
import { SupplierPortalController } from '../suppliers/supplier-portal.controller';
import { XeroController } from '../xero/xero.controller';

describe('analytics and quality controller delegation coverage', () => {
  const user = { sub: 'user-1', supplierId: 'supplier-1', tenantId: 'tenant-1' };
  const req = { user };

  it('delegates analytics controller calls with parsed query defaults', async () => {
    const churnService = {
      computeAndStore: jest.fn(),
      getLatestPredictions: jest.fn().mockResolvedValue([{ id: 'churn-1' }]),
      getSegmentSummary: jest.fn().mockResolvedValue({ high: 1 }),
    };
    const clvService = {
      computeAndStore: jest.fn(),
      getLatestPredictions: jest.fn().mockResolvedValue([{ id: 'clv-1' }]),
      getSegmentationSummary: jest.fn().mockResolvedValue({ vip: 1 }),
    };
    const cashflowService = { forecast: jest.fn().mockResolvedValue([{ day: 1 }]) };
    const forecastService = { getDemandForecast: jest.fn().mockResolvedValue([{ day: 1 }]) };
    const predictiveService = {
      calculateCLVScores: jest.fn(),
      getAtRiskCustomers: jest.fn(),
      getSalesTrend: jest.fn(),
    };

    const churn = new ChurnController(churnService as any);
    const clv = new ClvController(clvService as any);
    const cashflow = new CashflowController(cashflowService as any);
    const forecast = new ForecastController(forecastService as any);
    const predictive = new PredictiveAnalyticsController(predictiveService as any);

    await expect(churn.compute(user)).resolves.toEqual({ message: 'Churn prediction completed' });
    await expect(churn.getPredictions(user, 'high')).resolves.toEqual([{ id: 'churn-1' }]);
    await expect(churn.getSummary(user)).resolves.toEqual({ high: 1 });
    await expect(clv.compute(user)).resolves.toEqual({ message: 'CLV computation completed' });
    await expect(clv.getPredictions(user, 'vip')).resolves.toEqual([{ id: 'clv-1' }]);
    await expect(clv.getSummary(user)).resolves.toEqual({ vip: 1 });
    await cashflow.getForecast(user, '120');
    await cashflow.getForecast(user, 'bad');
    await cashflow.getForecast(user);
    await forecast.getProductForecast(user, 'product-1', '45');
    await forecast.getProductForecast(user, 'product-1', 'bad');
    await forecast.getProductForecast(user, 'product-1');
    await predictive.getCLVScores(req);
    await predictive.getSalesTrend(req, '8');
    await predictive.getSalesTrend(req);
    await predictive.getAtRiskCustomers(req);

    expect(churnService.computeAndStore).toHaveBeenCalledWith('tenant-1');
    expect(churnService.getLatestPredictions).toHaveBeenCalledWith('tenant-1', 'high');
    expect(churnService.getSegmentSummary).toHaveBeenCalledWith('tenant-1');
    expect(clvService.computeAndStore).toHaveBeenCalledWith('tenant-1');
    expect(clvService.getLatestPredictions).toHaveBeenCalledWith('tenant-1', 'vip');
    expect(clvService.getSegmentationSummary).toHaveBeenCalledWith('tenant-1');
    expect(cashflowService.forecast).toHaveBeenNthCalledWith(1, 'tenant-1', 90);
    expect(cashflowService.forecast).toHaveBeenNthCalledWith(2, 'tenant-1', 30);
    expect(cashflowService.forecast).toHaveBeenNthCalledWith(3, 'tenant-1', 30);
    expect(forecastService.getDemandForecast).toHaveBeenNthCalledWith(1, 'tenant-1', 'product-1', 45);
    expect(forecastService.getDemandForecast).toHaveBeenNthCalledWith(2, 'tenant-1', 'product-1', 30);
    expect(forecastService.getDemandForecast).toHaveBeenNthCalledWith(3, 'tenant-1', 'product-1', 30);
    expect(predictiveService.calculateCLVScores).toHaveBeenCalledWith('tenant-1');
    expect(predictiveService.getSalesTrend).toHaveBeenNthCalledWith(1, 'tenant-1', 8);
    expect(predictiveService.getSalesTrend).toHaveBeenNthCalledWith(2, 'tenant-1', 12);
    expect(predictiveService.getAtRiskCustomers).toHaveBeenCalledWith('tenant-1');
  });

  it('delegates Xero controller flows including no-connection errors and sync branches', async () => {
    const service = {
      getConnection: jest.fn(),
      saveConnection: jest.fn(),
      syncCustomers: jest.fn(),
      syncInvoices: jest.fn(),
    };
    const controller = new XeroController(service as any);
    const connection = { id: 'conn-1', lastSyncAt: new Date('2026-05-21T00:00:00.000Z') };

    await expect(controller.connect(user, { tenantId: 'xero-tenant' })).resolves.toEqual({
      message: 'Xero connection saved',
    });
    service.getConnection.mockResolvedValueOnce(connection).mockResolvedValueOnce(null);
    await expect(controller.status(user)).resolves.toEqual({ connected: true, lastSync: connection.lastSyncAt });
    await expect(controller.status(user)).resolves.toEqual({ connected: false, lastSync: undefined });

    service.getConnection.mockResolvedValueOnce(null);
    await expect(controller.sync(user, { type: 'customers' })).rejects.toThrow('No Xero connection found');

    service.getConnection
      .mockResolvedValueOnce(connection)
      .mockResolvedValueOnce(connection)
      .mockResolvedValueOnce(connection);
    await expect(controller.sync(user, { type: 'customers' })).resolves.toEqual({ message: 'Synced customers' });
    await expect(controller.sync(user, { type: 'invoices' })).resolves.toEqual({ message: 'Synced invoices' });
    await expect(controller.sync(user, { type: 'payments' })).resolves.toEqual({ message: 'Synced payments' });

    expect(service.saveConnection).toHaveBeenCalledWith('tenant-1', { tenantId: 'xero-tenant' });
    expect(service.syncCustomers).toHaveBeenCalledWith('conn-1', connection);
    expect(service.syncInvoices).toHaveBeenCalledWith('conn-1', connection);
  });

  it('delegates QMS controller actions with tenant and user context', async () => {
    const service = {
      completeCAPA: jest.fn(),
      createCAPA: jest.fn(),
      createDefectCode: jest.fn(),
      createNCR: jest.fn(),
      createPlan: jest.fn(),
      getCAPAs: jest.fn(),
      getDefectCodes: jest.fn(),
      getInspections: jest.fn(),
      getNCRs: jest.fn(),
      getPlans: jest.fn(),
      getQualityReport: jest.fn(),
      getSupplierQualityReport: jest.fn(),
      getSupplierQualityScore: jest.fn(),
      recordInspection: jest.fn(),
    };
    const controller = new QmsController(service as any);

    await controller.createPlan(req, { name: 'Incoming QC' } as any);
    await controller.getPlans(req, 'product-1');
    await controller.recordInspection(req, { referenceId: 'po-1', results: [{ ok: true }] });
    await controller.getInspections(req, 'purchase_order', 'po-1');
    await controller.createNCR(req, { title: 'Scratch' } as any);
    await controller.getNCRs(req, 'open');
    await controller.createCAPA(req, { title: 'Fix process' } as any);
    await controller.getCAPAs(req, 'ncr-1');
    await controller.completeCAPA(req, 'capa-1');
    await controller.createDefectCode(req, { code: 'SCRATCH' });
    await controller.getDefectCodes(req);
    await controller.getQualityReport(req, { startDate: '2026-05-01', endDate: '2026-05-21' } as any);
    await controller.getSupplierScore(req, 'supplier-1');
    await controller.getSupplierReport(req);

    expect(service.createPlan).toHaveBeenCalledWith('tenant-1', { name: 'Incoming QC' });
    expect(service.recordInspection).toHaveBeenCalledWith('tenant-1', 'user-1', {
      referenceId: 'po-1',
      results: [{ ok: true }],
    });
    expect(service.completeCAPA).toHaveBeenCalledWith('tenant-1', 'capa-1', 'user-1');
    expect(service.getQualityReport).toHaveBeenCalledWith('tenant-1', new Date('2026-05-01'), new Date('2026-05-21'));
    expect(service.getSupplierQualityScore).toHaveBeenCalledWith('tenant-1', 'supplier-1');
  });

  it('delegates manufacturing controller actions with parsed defaults', async () => {
    const service = {
      addBOMItem: jest.fn(),
      addRoutingStep: jest.fn(),
      calculateProductionCost: jest.fn(),
      calculateVarianceAnalysis: jest.fn(),
      completeProduction: jest.fn(),
      createProductionOrder: jest.fn(),
      getBOM: jest.fn(),
      getProductionOrderById: jest.fn(),
      getQCCheckpoints: jest.fn(),
      getRoutingSteps: jest.fn(),
      listProductionOrders: jest.fn(),
      removeRoutingStep: jest.fn(),
      reportProductionProgress: jest.fn(),
      startProduction: jest.fn(),
      updateQCCheckpoint: jest.fn(),
    };
    const controller = new ManufacturingController(service as any);

    await controller.getBOM(req, 'product-1');
    await controller.addBOMItem(req, { productId: 'product-1', quantity: 2 } as any);
    await controller.listOrders(req, 'draft', 3 as any);
    await controller.listOrders(req, undefined, undefined);
    await controller.createOrder(req, { productId: 'product-1' } as any);
    await controller.startOrder(req, 'order-1');
    await controller.completeOrder(req, 'order-1');
    await controller.reportProgress(req, 'order-1', { quantity: 5 });
    await controller.getOrder(req, 'order-1');
    await controller.getQCCheckpoints(req, 'order-1');
    await controller.updateQCCheckpoint(req, 'order-1', 'checkpoint-1', { notes: 'ok', status: 'passed' } as any);
    await controller.calculateCost(req, 'product-1', '4');
    await controller.calculateVariance(req, 'order-1');
    await controller.getRouting(req, 'product-1');
    await controller.addRoutingStep(req, { cycleTimeMinutes: 5, operationName: 'Cut', productId: 'product-1', sequenceOrder: 1 });
    await controller.removeRoutingStep(req, 'routing-1');

    expect(service.getBOM).toHaveBeenCalledWith('product-1', 'tenant-1');
    expect(service.addBOMItem).toHaveBeenCalledWith('tenant-1', 'product-1', { productId: 'product-1', quantity: 2 });
    expect(service.listProductionOrders).toHaveBeenNthCalledWith(1, 'tenant-1', 'draft', 20, 3);
    expect(service.listProductionOrders).toHaveBeenNthCalledWith(2, 'tenant-1', undefined, 20, 1);
    expect(service.updateQCCheckpoint).toHaveBeenCalledWith('order-1', 'checkpoint-1', 'passed', 'ok', 'tenant-1');
    expect(service.calculateProductionCost).toHaveBeenCalledWith('tenant-1', 'product-1', 4);
    expect(service.addRoutingStep).toHaveBeenCalledWith('tenant-1', {
      cycleTimeMinutes: 5,
      operationName: 'Cut',
      productId: 'product-1',
      sequenceOrder: 1,
    });
  });

  it('delegates supplier portal and benchmark controllers', async () => {
    const supplierService = {
      confirmShipment: jest.fn(),
      getPurchaseOrders: jest.fn(),
      submitQuotation: jest.fn(),
    };
    const supplierController = new SupplierPortalController(supplierService as any);
    supplierController.getOrders(req);
    supplierController.getOrders({ user: { tenantId: 'tenant-1' } });
    supplierController.confirmShipment(req, 'po-1', { trackingNumber: 'TRACK-1' });
    supplierController.confirmShipment({ user: { tenantId: 'tenant-1' } }, 'po-2', { trackingNumber: 'TRACK-2' });
    supplierController.submitQuote({ user: { tenantId: 'tenant-1' } }, 'rfq-1', { total: 100 });

    expect(supplierService.getPurchaseOrders).toHaveBeenCalledWith('tenant-1', 'supplier-1');
    expect(supplierService.getPurchaseOrders).toHaveBeenLastCalledWith('tenant-1', 'dummy-supplier-id');
    expect(supplierService.confirmShipment).toHaveBeenCalledWith('tenant-1', 'supplier-1', 'po-1', {
      trackingNumber: 'TRACK-1',
    });
    expect(supplierService.confirmShipment).toHaveBeenLastCalledWith('tenant-1', 'dummy-supplier-id', 'po-2', {
      trackingNumber: 'TRACK-2',
    });
    expect(supplierService.submitQuotation).toHaveBeenCalledWith('tenant-1', 'dummy-supplier-id', 'rfq-1', {
      total: 100,
    });

    const benchmarkService = { getStats: jest.fn(), getTimeseries: jest.fn() };
    const benchmarkController = new BenchmarksController(benchmarkService as any);
    await benchmarkController.getSyncBenchmarks(req as any, '48');
    await benchmarkController.getSyncBenchmarks(req as any);
    await benchmarkController.getSyncTimeseries(req as any, '12');
    await benchmarkController.getSyncTimeseries(req as any);

    expect(benchmarkService.getStats).toHaveBeenNthCalledWith(1, 'tenant-1', 48);
    expect(benchmarkService.getStats).toHaveBeenNthCalledWith(2, 'tenant-1', 24);
    expect(benchmarkService.getTimeseries).toHaveBeenNthCalledWith(1, 'tenant-1', 12);
    expect(benchmarkService.getTimeseries).toHaveBeenNthCalledWith(2, 'tenant-1', 24);
  });
});
