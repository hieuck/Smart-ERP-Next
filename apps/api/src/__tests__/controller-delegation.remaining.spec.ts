import { AnalyticsDashboardController } from '../analytics-dashboard/analytics-dashboard.controller';
import { AutomationController } from '../automation/automation.controller';
import { ExchangeRateController } from '../currencies/exchange-rate.controller';
import { EContractsController } from '../e-contracts/e-contracts.controller';
import { EcommerceController } from '../ecommerce/ecommerce.controller';
import { AiController } from '../ai/ai.controller';
import { AiCopilotController } from '../ai-copilot/ai-copilot.controller';
import { FieldServiceController } from '../field-service/field-service.controller';
import { FinanceController } from '../finance/finance.controller';
import { FixedAssetsController } from '../fixed-assets/controllers/fixed-assets.controller';
import { ForecastController } from '../forecast/forecast.controller';
import { InsightsController } from '../insights/insights.controller';
import { PerformanceController } from '../hr/controllers/performance.controller';
import { PayrollController } from '../hr/controllers/payroll.controller';
import { InventoryRecommendationController } from '../inventory-recommendation/inventory-recommendation.controller';
import { LoyaltyController } from '../loyalty/controllers/loyalty.controller';
import { MaintenanceController } from '../maintenance/maintenance.controller';
import { MarketingController } from '../marketing/marketing.controller';
import { ActivityController } from '../modules/activity/activity.controller';
import { SyncController } from '../modules/sync/sync.controller';
import { MRPController } from '../mrp/mrp.controller';
import { NextBestActionController } from '../crm/next-best-action.controller';
import { OmnichannelController } from '../omnichannel/omnichannel.controller';
import { PaymentsController } from '../payments/payments.controller';
import { SearchController } from '../search/search.controller';
import { SupplierCollaborationController } from '../suppliers/supplier-collaboration.controller';
import { SuppliersController } from '../suppliers/suppliers.controller';
import { TenantsController } from '../tenants/tenants.controller';
import { TmsController } from '../tms/tms.controller';
import { WarehouseTransferController } from '../warehouses/warehouse-transfer.controller';
import { WebhooksController } from '../webhooks/webhooks.controller';
import { WmsController } from '../wms/wms.controller';

describe('remaining controller delegation coverage', () => {
  const req = {
    user: {
      role: 'admin',
      sub: 'user-1',
      tenantId: 'tenant-1',
    },
  };

  it('delegates automation, ecommerce, webhook, tenant, and supplier controller actions', async () => {
    const automationService = {
      createWorkflow: jest.fn(),
      getAvailableActions: jest.fn(),
      getAvailableTriggers: jest.fn(),
      listWorkflows: jest.fn(),
      toggleWorkflow: jest.fn(),
    };
    const automation = new AutomationController(automationService as any);
    automation.getTriggers(req);
    automation.getActions(req);
    automation.listWorkflows(req);
    automation.createWorkflow(req, { name: 'Auto', triggerType: 'webhook', steps: [] });
    automation.toggleWorkflow(req, 'workflow-1', { isActive: false });
    expect(automationService.createWorkflow).toHaveBeenCalledWith('tenant-1', {
      name: 'Auto',
      triggerType: 'webhook',
      steps: [],
    });
    expect(automationService.toggleWorkflow).toHaveBeenCalledWith('tenant-1', 'workflow-1', false);

    const ecommerceService = {
      createStore: jest.fn(),
      getStores: jest.fn(),
      getSyncLogs: jest.fn(),
      syncAllStores: jest.fn(),
    };
    const ecommerce = new EcommerceController(ecommerceService as any);
    await ecommerce.getStores(req.user);
    await ecommerce.createStore(req.user, { platform: 'shopee' });
    await ecommerce.syncAll(req.user);
    await ecommerce.syncStore('store-1', req.user);
    await ecommerce.getSyncLogs(req.user, 'store-1');
    await ecommerce.getSyncLogs(req.user);
    expect(ecommerceService.syncAllStores).toHaveBeenNthCalledWith(1, 'tenant-1');
    expect(ecommerceService.syncAllStores).toHaveBeenNthCalledWith(2, 'tenant-1', 'store-1');
    expect(ecommerceService.getSyncLogs).toHaveBeenNthCalledWith(2, 'tenant-1', undefined);

    const webhooksService = {
      getDeliveryLogs: jest.fn(),
      listSubscriptions: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };
    const webhooks = new WebhooksController(webhooksService as any);
    webhooks.subscribe(req, { events: ['order.created'] as any, secret: 's1', url: 'https://hook.test' });
    webhooks.listSubscriptions(req);
    webhooks.unsubscribe(req, 'sub-1');
    webhooks.getDeliveryLogs(req, 'sub-1', '9');
    webhooks.getDeliveryLogs(req, 'sub-1');
    expect(webhooksService.subscribe).toHaveBeenCalledWith('tenant-1', 'https://hook.test', ['order.created'], 's1');
    expect(webhooksService.getDeliveryLogs).toHaveBeenNthCalledWith(1, 'tenant-1', 'sub-1', 9);
    expect(webhooksService.getDeliveryLogs).toHaveBeenNthCalledWith(2, 'tenant-1', 'sub-1', 50);

    const tenantsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const tenants = new TenantsController(tenantsService as any);
    tenants.create({ name: 'Tenant' } as any);
    tenants.findAll();
    tenants.findOne('tenant-1');
    tenants.update('tenant-1', { name: 'Updated' } as any);
    tenants.remove('tenant-1');
    expect(tenantsService.update).toHaveBeenCalledWith('tenant-1', { name: 'Updated' });

    const suppliersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const suppliers = new SuppliersController(suppliersService as any);
    suppliers.create(req, { name: 'Supplier' } as any);
    suppliers.findAll(req, '2', '50', 'paper', 'true');
    suppliers.findAll(req);
    suppliers.findOne(req, 'supplier-1');
    suppliers.update(req, 'supplier-1', { name: 'Updated' } as any);
    suppliers.remove(req, 'supplier-1');
    expect(suppliersService.findAll).toHaveBeenNthCalledWith(1, 'tenant-1', {
      isActive: true,
      limit: 50,
      page: 2,
      search: 'paper',
    });
    expect(suppliersService.findAll).toHaveBeenNthCalledWith(2, 'tenant-1', {
      isActive: undefined,
      limit: undefined,
      page: undefined,
      search: undefined,
    });
  });

  it('delegates field service, warehouse, WMS, TMS, fixed asset, and recommendation workflows', async () => {
    const fieldService = {
      checkIn: jest.fn(),
      completeTicket: jest.fn(),
      createTicket: jest.fn(),
      getTickets: jest.fn(),
    };
    const field = new FieldServiceController(fieldService as any);
    field.getTickets(req);
    field.getTickets({ user: { ...req.user, role: 'technician' } });
    field.createTicket(req, { title: 'Repair' });
    field.checkIn(req, 'ticket-1', { lat: 10 });
    field.completeTicket(req, 'ticket-1', { resolution: 'done' });
    expect(fieldService.getTickets).toHaveBeenNthCalledWith(1, 'tenant-1', undefined);
    expect(fieldService.getTickets).toHaveBeenNthCalledWith(2, 'tenant-1', 'user-1');

    const warehouseTransferService = {
      confirmTransfer: jest.fn(),
      createTransfer: jest.fn(),
      getTransferById: jest.fn(),
      listTransfers: jest.fn(),
      receiveTransfer: jest.fn(),
    };
    const transfers = new WarehouseTransferController(warehouseTransferService as any);
    await transfers.create(req, {
      fromWarehouseId: 'wh-1',
      items: [{ productId: 'product-1', quantity: 2 }],
      notes: 'move',
      toWarehouseId: 'wh-2',
    });
    await transfers.confirm(req, 'transfer-1');
    await transfers.receive(req, 'transfer-1');
    await transfers.getById(req, 'transfer-1');
    await transfers.list(req, '3', '40');
    await transfers.list(req);
    expect(warehouseTransferService.createTransfer).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'wh-1',
      'wh-2',
      [{ productId: 'product-1', quantity: 2 }],
      'move',
    );
    expect(warehouseTransferService.listTransfers).toHaveBeenNthCalledWith(1, 'tenant-1', 3, 40);
    expect(warehouseTransferService.listTransfers).toHaveBeenNthCalledWith(2, 'tenant-1', 1, 20);

    const wmsService = {
      completeTaskAndDispatch: jest.fn(),
      confirmPick: jest.fn(),
      createPickingTask: jest.fn(),
      getTaskDetails: jest.fn(),
      listTasks: jest.fn(),
    };
    const wms = new WmsController(wmsService as any);
    wms.listTasks(req, 'pick');
    wms.getTaskDetails(req, 'task-1');
    wms.confirmPick(req, 'item-1', { quantity: 2 });
    wms.createPick(req, { orderId: 'order-1' });
    wms.completeTask(req, 'task-1');
    expect(wmsService.confirmPick).toHaveBeenCalledWith('tenant-1', 'item-1', 2);

    const tmsService = {
      confirmDelivery: jest.fn(),
      createTrip: jest.fn(),
      getTripDetails: jest.fn(),
      listTrips: jest.fn(),
      listVehicles: jest.fn(),
    };
    const tms = new TmsController(tmsService as any);
    tms.listTrips(req, 'driver-1');
    tms.getTripDetails(req, 'trip-1');
    tms.confirmDelivery(req, 'stop-1', { signature: 'ok' });
    tms.createTrip(req, { code: 'TRIP-1' });
    tms.listVehicles(req);
    expect(tmsService.confirmDelivery).toHaveBeenCalledWith('tenant-1', 'stop-1', { signature: 'ok' });

    const fixedAssetsService = {
      create: jest.fn(),
      dispose: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      runMonthlyDepreciation: jest.fn(),
    };
    const fixedAssets = new FixedAssetsController(fixedAssetsService as any);
    fixedAssets.create(req, { code: 'FA-1' });
    fixedAssets.findAll(req, '2', '25', 'vehicle', 'active');
    fixedAssets.findAll(req);
    fixedAssets.findOne(req, 'asset-1');
    fixedAssets.runDepreciation(req);
    fixedAssets.dispose(req, 'asset-1');
    expect(fixedAssetsService.findAll).toHaveBeenNthCalledWith(1, 'tenant-1', {
      category: 'vehicle',
      limit: 25,
      page: 2,
      status: 'active',
    });

    const recommendationService = {
      getRecommendation: jest.fn(),
      getReorderSuggestion: jest.fn(),
    };
    const recommendation = new InventoryRecommendationController(recommendationService as any);
    await recommendation.suggest(req, 'product-1', '7');
    await recommendation.suggest(req, 'product-1', undefined as any);
    await recommendation.suggestReorder(req, { currentStock: 3, productId: 'product-1' } as any);
    expect(recommendationService.getRecommendation).toHaveBeenNthCalledWith(1, 'tenant-1', 'user-1', 'product-1', 7);
    expect(recommendationService.getRecommendation).toHaveBeenNthCalledWith(2, 'tenant-1', 'user-1', 'product-1', 0);
  });

  it('delegates HR, analytics, finance, marketing, payments, and contract workflows', async () => {
    const payrollService = {
      approveBoard: jest.fn(),
      generateSalaryBoard: jest.fn(),
      getPayslips: jest.fn(),
      listBoards: jest.fn(),
    };
    const payroll = new PayrollController(payrollService as any);
    payroll.listBoards(req);
    payroll.generateBoard(req, { month: 5, year: 2026 });
    payroll.getPayslips(req, 'board-1');
    payroll.approveBoard(req, 'board-1');
    expect(payrollService.generateSalaryBoard).toHaveBeenCalledWith('tenant-1', 'user-1', 5, 2026);

    const performanceService = {
      createPerformanceReview: jest.fn(),
      getEmployeeKPIs: jest.fn(),
      updateKpiProgress: jest.fn(),
    };
    const performance = new PerformanceController(performanceService as any);
    performance.getMyKPIs(req, 'month');
    performance.getEmployeeKPIs(req, 'employee-1', 'quarter');
    performance.updateProgress(req, 'target-1', { actualValue: 12 });
    performance.createReview(req, { employeeId: 'employee-1' });
    expect(performanceService.updateKpiProgress).toHaveBeenCalledWith('tenant-1', 'user-1', 'target-1', 12);

    const analyticsService = {
      getAIInsights: jest.fn(),
      getKPIs: jest.fn(),
      getRevenueChart: jest.fn(),
      getTopProducts: jest.fn(),
    };
    const analytics = new AnalyticsDashboardController(analyticsService as any);
    await analytics.getKPIs(req, 'week');
    await analytics.getKPIs(req);
    await analytics.getRevenueChart(req, 14);
    await analytics.getRevenueChart(req);
    await analytics.getTopProducts(req, 5);
    await analytics.getTopProducts(req);
    await analytics.getAIInsights(req);
    expect(analyticsService.getKPIs).toHaveBeenNthCalledWith(1, 'tenant-1', 'week');
    expect(analyticsService.getKPIs).toHaveBeenNthCalledWith(2, 'tenant-1', 'month');
    expect(analyticsService.getRevenueChart).toHaveBeenNthCalledWith(2, 'tenant-1', 30);
    expect(analyticsService.getTopProducts).toHaveBeenNthCalledWith(2, 'tenant-1', 10);

    const financeService = {
      generateForecast: jest.fn(),
      getBudgetVariance: jest.fn(),
      listBudgets: jest.fn(),
    };
    const finance = new FinanceController(financeService as any);
    finance.getForecast(req, 'Q2');
    finance.getForecast(req, undefined as any);
    finance.listBudgets(req);
    finance.getBudgetVariance(req, 'budget-1');
    expect(financeService.generateForecast).toHaveBeenNthCalledWith(2, 'tenant-1', 'Current');

    const marketingService = {
      createCampaign: jest.fn(),
      getCampaignPerformance: jest.fn(),
      getSegments: jest.fn(),
      processEvent: jest.fn(),
    };
    const marketing = new MarketingController(marketingService as any);
    marketing.getCampaigns(req);
    marketing.getSegments(req);
    marketing.createCampaign(req, { name: 'Campaign' });
    marketing.trackEvent(req, 'lead-1', { event: 'opened' });
    expect(marketingService.processEvent).toHaveBeenCalledWith('tenant-1', 'lead-1', 'opened');

    const paymentsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getSummary: jest.fn(),
    };
    const payments = new PaymentsController(paymentsService as any);
    payments.create(req, { amount: 100 } as any);
    payments.findAll(req, '2', '25', 'inbound', 'cash', '2026-05-01', '2026-05-21');
    payments.findAll(req);
    payments.getSummary(req, '2026-05-01', '2026-05-21');
    payments.findOne(req, 'payment-1');
    expect(paymentsService.findAll).toHaveBeenNthCalledWith(1, 'tenant-1', {
      from: '2026-05-01',
      limit: 25,
      method: 'cash',
      page: 2,
      to: '2026-05-21',
      type: 'inbound',
    });

    const contractsService = {
      createContract: jest.fn(),
      getContracts: jest.fn(),
      signContract: jest.fn(),
    };
    const contracts = new EContractsController(contractsService as any);
    contracts.getContracts(req);
    contracts.createContract(req, { title: 'Contract' });
    contracts.signContract(req, 'contract-1', { signer: 'user-1' });
    expect(contractsService.signContract).toHaveBeenCalledWith('tenant-1', 'contract-1', { signer: 'user-1' });
  });

  it('delegates search, sync, forecast, MRP, activity, maintenance, omnichannel, and currency workflows', async () => {
    const searchService = {
      autocomplete: jest.fn(),
      search: jest.fn(),
    };
    const search = new SearchController(searchService as any);
    await search.search(req, 'invoice', '7');
    await search.search(req, 'invoice');
    await search.autocomplete(req, 'inv', '6');
    await search.autocomplete(req, 'inv');
    expect(searchService.search).toHaveBeenNthCalledWith(1, 'tenant-1', 'invoice', 7);
    expect(searchService.search).toHaveBeenNthCalledWith(2, 'tenant-1', 'invoice', 20);
    expect(searchService.autocomplete).toHaveBeenNthCalledWith(2, 'tenant-1', 'inv', 10);

    const syncService = {
      getMetadata: jest.fn(),
      pull: jest.fn(),
      push: jest.fn(),
    };
    const sync = new SyncController(syncService as any);
    await sync.pull(req as any, { clientId: 'client-1', vectorClock: { orders: 1 } });
    await sync.push(req as any, { changes: [{ id: 'c1' }], clientId: 'client-1' });
    await sync.getMetadata(req as any, 'client-1');
    await sync.getMetadata(req as any);
    expect(syncService.pull).toHaveBeenCalledWith('tenant-1', 'client-1', { orders: 1 });
    expect(syncService.getMetadata).toHaveBeenNthCalledWith(1, 'tenant-1', 'client-1');
    expect(syncService.getMetadata).toHaveBeenNthCalledWith(2, 'tenant-1', 'web-e2e');

    const forecastService = { getMonthlyDemand: jest.fn().mockResolvedValue([1, 2, 3]) };
    const forecast = new ForecastController(forecastService as any);
    await expect(forecast.getProductForecast('product-1')).resolves.toEqual({
      data: [1, 2, 3],
      productId: 'product-1',
    });

    const mrpService = {
      calculateMRP: jest.fn(),
      calculateMRPBatch: jest.fn(),
    };
    const mrp = new MRPController(mrpService as any);
    await mrp.calculateMRP(req, 'product-1', 15);
    await mrp.calculateMRP(req, 'product-1');
    await mrp.calculateMRPBatch(req, 45);
    await mrp.calculateMRPBatch(req);
    expect(mrpService.calculateMRP).toHaveBeenNthCalledWith(2, 'tenant-1', 'product-1', 30);
    expect(mrpService.calculateMRPBatch).toHaveBeenNthCalledWith(2, 'tenant-1', undefined, 30);

    const activityService = {
      findAllPaginated: jest.fn(),
      getRecentActivities: jest.fn().mockResolvedValue([{ id: 'activity-1' }]),
    };
    const activity = new ActivityController(activityService as any);
    await activity.findAll('tenant-1', { page: 1 } as any);
    await expect(activity.getRecentActivities('tenant-1')).resolves.toEqual({ items: [{ id: 'activity-1' }] });
    expect(activityService.getRecentActivities).toHaveBeenCalledWith('tenant-1', 10);

    const maintenanceService = {
      createMaintenanceRequest: jest.fn(),
      listOrders: jest.fn(),
      processDueSchedules: jest.fn(),
    };
    const maintenance = new MaintenanceController(maintenanceService as any);
    maintenance.getOrders(req);
    maintenance.createRequest(req, { assetId: 'asset-1' });
    maintenance.processSchedules(req);
    expect(maintenanceService.createMaintenanceRequest).toHaveBeenCalledWith('tenant-1', { assetId: 'asset-1' });

    const omnichannelService = {
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
    };
    const omnichannel = new OmnichannelController(omnichannelService as any);
    omnichannel.getMessages(req, 'zalo-1');
    omnichannel.sendMessage(req, { text: 'hello' });
    expect(omnichannelService.getMessages).toHaveBeenCalledWith('tenant-1', 'zalo-1');

    const exchangeService = {
      convert: jest.fn(),
      fetchRate: jest.fn(),
      getSupportedCurrencies: jest.fn(),
    };
    const exchange = new ExchangeRateController(exchangeService as any);
    await exchange.getRate(req, 'VND', 'USD');
    await exchange.getRate(req, undefined as any, undefined as any);
    await exchange.convert(req, { amount: 100, from: 'USD', to: 'VND' });
    exchange.getSupported();
    expect(exchangeService.fetchRate).toHaveBeenNthCalledWith(2, 'VND', 'USD');
    expect(exchangeService.convert).toHaveBeenCalledWith(100, 'USD', 'VND', 'tenant-1');
  });

  it('delegates next-best-action and supplier collaboration and constructs empty AI controller', async () => {
    const nbaService = { getNextBestAction: jest.fn().mockResolvedValue({ action: 'call' }) };
    const nba = new NextBestActionController(nbaService as any);
    await expect(nba.getForLead('lead-1', req.user)).resolves.toEqual({ action: 'call' });
    expect(nbaService.getNextBestAction).toHaveBeenCalledWith('lead-1', 'tenant-1');

    const collaborationService = {
      confirmDelivery: jest.fn(),
      getSupplierOrders: jest.fn(),
      getSupplierPerformance: jest.fn(),
    };
    const collaboration = new SupplierCollaborationController(collaborationService as any);
    await collaboration.getMyOrders(req);
    await collaboration.getMyPerformance(req);
    await collaboration.confirmDelivery(req, 'order-1');
    expect(collaborationService.confirmDelivery).toHaveBeenCalledWith('user-1', 'order-1', 'tenant-1');

    const aiCopilotService = { getExecutiveInsights: jest.fn() };
    const aiCopilot = new AiCopilotController(aiCopilotService as any);
    aiCopilot.getInsights(req);
    expect(aiCopilotService.getExecutiveInsights).toHaveBeenCalledWith('tenant-1');

    const insightsService = { getDashboardInsights: jest.fn() };
    const insights = new InsightsController(insightsService as any);
    insights.getDashboardInsights(req);
    expect(insightsService.getDashboardInsights).toHaveBeenCalledWith('tenant-1');

    const loyalty = new LoyaltyController();
    await expect(loyalty.getUserPoints()).resolves.toEqual({ points: 0 });
    await expect(loyalty.redeemPoints({ points: 10 })).resolves.toEqual({ success: true });

    expect(new AiController()).toBeInstanceOf(AiController);
  });
});
