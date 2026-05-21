jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-1') }));

import { AccountingController } from '../accounting/accounting.controller';
import { ChartOfAccountsController } from '../accounting/chart-of-accounts.controller';
import { JournalEntriesController } from '../accounting/journal-entries.controller';
import { AuthController } from '../auth/auth.controller';
import { CommentsController } from '../comments/comments.controller';
import { CrmController } from '../crm/crm.controller';
import { LeadsController } from '../crm/leads/leads.controller';
import { ExportController } from '../exports/export.controller';
import { ExportFormat } from '../exports/export.enums';
import { HrController } from '../hr/controllers/hr.controller';
import { LotsController } from '../inventory/lots.controller';
import { TransfersController } from '../inventory/transfers.controller';
import { ProjectsController } from '../projects/controllers/projects.controller';
import { PurchasingController } from '../purchasing/purchasing.controller';
import { UsersController } from '../users/users.controller';
import { WarehousesController } from '../warehouses/warehouses.controller';

describe('backoffice controller delegation coverage', () => {
  const req = { user: { sub: 'user-1', tenantId: 'tenant-1' } };

  it('delegates project, user, and export controller actions', async () => {
    const projectService = {
      allocateResource: jest.fn(),
      createProject: jest.fn(),
      createTask: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getGanttData: jest.fn(),
      getProjectProfitability: jest.fn(),
      submitTimesheet: jest.fn(),
    };
    const projects = new ProjectsController(projectService as any);
    projects.create(req, { name: 'ERP rollout' });
    projects.findAll(req, '2', 'active');
    projects.findAll(req);
    projects.findOne(req, 'project-1');
    projects.submitTimesheet(req, 'project-1', { hours: 2 });
    projects.getProfitability(req, 'project-1');
    projects.createTask(req, 'project-1', { title: 'Design' });
    projects.getGantt(req, 'project-1');
    projects.allocateResource(req, 'project-1', { allocation: 50, userId: 'user-2' });

    expect(projectService.findAll).toHaveBeenNthCalledWith(1, 'tenant-1', { page: 2, status: 'active' });
    expect(projectService.findAll).toHaveBeenNthCalledWith(2, 'tenant-1', { page: undefined, status: undefined });
    expect(projectService.allocateResource).toHaveBeenCalledWith('tenant-1', 'project-1', 'user-2', {
      allocation: 50,
      userId: 'user-2',
    });

    const usersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStats: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      updateProfile: jest.fn(),
    };
    const users = new UsersController(usersService as any);
    users.create(req, { email: 'user@example.com' } as any);
    users.findAll(req, 'an');
    users.getMe(req);
    users.getStats(req);
    users.findOne(req, 'user-2');
    users.update(req, 'user-2', { name: 'Updated' } as any);
    users.remove(req, 'user-2');
    await users.updateProfile(req, { name: 'Me' } as any);

    expect(usersService.create).toHaveBeenCalledWith({ email: 'user@example.com', tenantId: 'tenant-1' });
    expect(usersService.updateProfile).toHaveBeenCalledWith('tenant-1', 'user-1', { name: 'Me' });

    const exportService = {
      createExportJob: jest.fn(),
      getExportFile: jest.fn().mockResolvedValue(Buffer.from('{}')),
      getExportStatus: jest.fn(),
      getExportableEntities: jest.fn(),
    };
    const exportsController = new ExportController(exportService as any);
    const res = { send: jest.fn(), setHeader: jest.fn() };
    exportsController.getExportableEntities();
    exportsController.createExport(req, { entities: ['orders'], format: ExportFormat.JSON });
    exportsController.getExportStatus(req, 'job-1');
    await exportsController.downloadExport(req, 'job-1', res as any);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="export-job-1.json"');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('{}'));
  });

  it('delegates accounting, transfer, CRM, HR, and purchasing controller actions', () => {
    const chartService = {
      create: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getAccountTree: jest.fn(),
      seedDefaultAccounts: jest.fn(),
      update: jest.fn(),
    };
    const chart = new ChartOfAccountsController(chartService as any);
    chart.create(req, { code: '111' } as any);
    chart.findAll(req, 'asset', 'true', 'cash');
    chart.getTree(req);
    chart.findOne(req, 'account-1');
    chart.update(req, 'account-1', { name: 'Cash' } as any);
    chart.delete(req, 'account-1');
    chart.seedDefaultAccounts(req);

    expect(chartService.findAll).toHaveBeenCalledWith('tenant-1', { isActive: true, search: 'cash', type: 'asset' });

    const journalService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getTrialBalance: jest.fn(),
      post: jest.fn(),
      reverse: jest.fn(),
    };
    const journal = new JournalEntriesController(journalService as any);
    journal.create(req, { lines: [] } as any);
    journal.findAll(req, '2', '25', 'true', '2026-05-01', '2026-05-21');
    journal.findOne(req, 'entry-1');
    journal.post(req, 'entry-1');
    journal.reverse(req, 'entry-1', { reason: 'mistake' });
    journal.trialBalance(req, '2026-05-01', '2026-05-21');
    journal.findAll(req);
    journal.trialBalance(req);
    expect(journalService.findAll).toHaveBeenCalledWith('tenant-1', {
      fromDate: new Date('2026-05-01'),
      isPosted: true,
      limit: 25,
      page: 2,
      toDate: new Date('2026-05-21'),
    });
    expect(journalService.findAll).toHaveBeenLastCalledWith('tenant-1', {
      fromDate: undefined,
      isPosted: false,
      limit: undefined,
      page: undefined,
      toDate: undefined,
    });
    expect(journalService.getTrialBalance).toHaveBeenLastCalledWith('tenant-1', undefined, undefined);

    const accounting = new AccountingController({
      getDashboard: jest.fn(),
      getReports: jest.fn(),
    } as any);
    accounting.getDashboard(req, 'month');
    accounting.getReports(req, 'balance', 'month');

    const transferService = {
      approve: jest.fn(),
      cancel: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      receive: jest.fn(),
      ship: jest.fn(),
    };
    const transfers = new TransfersController(transferService as any);
    transfers.create(req, { items: [] });
    transfers.findAll(req, 'draft', 'wh-1', 'wh-2');
    transfers.findOne(req, 'transfer-1');
    transfers.approve(req, 'transfer-1');
    transfers.ship(req, 'transfer-1', { items: [{ itemId: 'i-1', quantityShipped: 1 }] });
    transfers.receive(req, 'transfer-1', { items: [{ itemId: 'i-1', quantityReceived: 1 }] });
    transfers.cancel(req, 'transfer-1');
    expect(transferService.findAll).toHaveBeenCalledWith('tenant-1', {
      fromWarehouseId: 'wh-1',
      status: 'draft',
      toWarehouseId: 'wh-2',
    });

    const crmService = {
      convertToOrder: jest.fn(),
      createDeal: jest.fn(),
      createLead: jest.fn(),
      getLeads: jest.fn(),
      getPipelines: jest.fn(),
      updateDealStage: jest.fn(),
      updateLeadStatus: jest.fn(),
    };
    const crm = new CrmController(crmService as any);
    crm.getLeads(req);
    crm.createLead(req, { name: 'Lead' });
    crm.updateLeadStatus(req, 'lead-1', { status: 'won' });
    crm.getPipelines(req);
    crm.createDeal(req, { title: 'Deal' });
    crm.updateDealStage(req, 'deal-1', { stageId: 'stage-1' });
    crm.convertToOrder(req, 'deal-1');

    const leadsService = {
      convertToCustomer: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStats: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const leads = new LeadsController(leadsService as any);
    leads.create(req, { firstName: 'An' } as any);
    leads.findAll(req, '2', '25', 'an', 'new', 'web', 'user-2');
    leads.findAll(req);
    leads.getStats(req);
    leads.findOne(req, 'lead-1');
    leads.update(req, 'lead-1', { status: 'qualified' } as any);
    leads.remove(req, 'lead-1');
    leads.convertToCustomer(req, 'lead-1', { customerData: { company: 'ABC' } as any });
    expect(leadsService.findAll).toHaveBeenCalledWith('tenant-1', {
      assignedToId: 'user-2',
      limit: 25,
      page: 2,
      search: 'an',
      source: 'web',
      status: 'new',
    });
    expect(leadsService.findAll).toHaveBeenLastCalledWith('tenant-1', {
      assignedToId: undefined,
      limit: undefined,
      page: undefined,
      search: undefined,
      source: undefined,
      status: undefined,
    });

    const hrService = {
      createEmployee: jest.fn(),
      findAllEmployees: jest.fn(),
      findOneEmployee: jest.fn(),
      getPayrolls: jest.fn(),
      processPayroll: jest.fn(),
      removeEmployee: jest.fn(),
      updateEmployee: jest.fn(),
    };
    const hr = new HrController(hrService as any);
    hr.create(req, { name: 'Employee' } as any);
    hr.findAll(req, '2', '25', 'an');
    hr.findAll(req);
    hr.findOne(req, 'employee-1');
    hr.update(req, 'employee-1', { name: 'Updated' } as any);
    hr.remove(req, 'employee-1');
    hr.processPayroll(req);
    hr.getPayrolls(req, '2', '25');
    hr.getPayrolls(req);
    expect(hrService.findAllEmployees).toHaveBeenLastCalledWith('tenant-1', {
      limit: undefined,
      page: undefined,
      search: undefined,
    });
    expect(hrService.getPayrolls).toHaveBeenLastCalledWith('tenant-1', {
      limit: undefined,
      page: undefined,
    });

    const purchasingService = {
      cancel: jest.fn(),
      confirm: jest.fn(),
      create: jest.fn(),
      createFromReorderSuggestions: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      receive: jest.fn(),
    };
    const purchasing = new PurchasingController(purchasingService as any);
    purchasing.create(req, { supplierId: 'supplier-1' } as any);
    purchasing.createFromReorderSuggestions(req, { suggestionIds: ['s-1'] } as any);
    purchasing.findAll(req, '2', '25', 'PO', 'draft');
    purchasing.findAll(req);
    purchasing.findOne(req, 'po-1');
    purchasing.confirm(req, 'po-1');
    purchasing.receive(req, 'po-1', { items: [{ itemId: 'i-1', receivedQty: 1 }] });
    purchasing.cancel(req, 'po-1');
    expect(purchasingService.receive).toHaveBeenCalledWith('tenant-1', 'po-1', 'user-1', [
      { itemId: 'i-1', receivedQty: 1 },
    ]);
    expect(purchasingService.findAll).toHaveBeenLastCalledWith('tenant-1', {
      limit: undefined,
      page: undefined,
      search: undefined,
      status: undefined,
    });
  });

  it('delegates comments, auth, lots, and warehouse controllers', async () => {
    const commentsService = {
      add: jest.fn().mockResolvedValue({ id: 'comment-1' }),
      delete: jest.fn(),
      getByOrder: jest.fn().mockResolvedValue([{ id: 'comment-1' }]),
    };
    const comments = new CommentsController(commentsService as any);
    await expect(comments.getComments(req, 'order-1')).resolves.toEqual({ items: [{ id: 'comment-1' }] });
    await comments.addComment(req, 'order-1', { content: 'Hi' });
    await expect(comments.deleteComment(req, 'order-1', 'comment-1')).resolves.toEqual({ success: true });

    const authService = {
      login: jest.fn().mockReturnValue({ access_token: 'token' }),
      register: jest.fn(),
      validateUser: jest.fn().mockResolvedValueOnce({ id: 'user-1' }).mockResolvedValueOnce(null),
    };
    const auth = new AuthController(authService as any);
    await auth.register({ companyName: 'Acme', email: 'a@b.com', name: 'An', password: 'pw', tenantId: 'tenant-1' } as any);
    await expect(auth.login({ email: 'a@b.com', password: 'pw' })).resolves.toEqual({ access_token: 'token' });
    await expect(auth.login({ email: 'a@b.com', password: 'bad' })).rejects.toThrow('Invalid credentials');
    expect(auth.getProfile(req)).toBe(req.user);

    const lotsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getExpiringSoon: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const lots = new LotsController(lotsService as any);
    lots.create(req, { lotNumber: 'L1' });
    lots.findAll(req, 'product-1', 'wh-1', 'true');
    lots.getExpiringSoon(req, '15');
    lots.getExpiringSoon(req);
    lots.findOne(req, 'lot-1');
    lots.update(req, 'lot-1', { quantity: 1 });
    lots.remove(req, 'lot-1');
    expect(lotsService.getExpiringSoon).toHaveBeenNthCalledWith(1, 'tenant-1', 15);
    expect(lotsService.getExpiringSoon).toHaveBeenNthCalledWith(2, 'tenant-1', 30);

    const warehouseService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findDefault: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const warehouses = new WarehousesController(warehouseService as any);
    warehouses.create(req, { name: 'Main' } as any);
    warehouses.findAll(req);
    warehouses.findDefault(req);
    warehouses.findOne(req, 'wh-1');
    warehouses.update(req, 'wh-1', { name: 'Updated' });
    warehouses.remove(req, 'wh-1');
  });
});
