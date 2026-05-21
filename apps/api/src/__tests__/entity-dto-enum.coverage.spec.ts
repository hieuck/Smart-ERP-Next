jest.mock('typeorm', () => {
  const decorator = () => () => undefined;
  return {
    Column: decorator,
    CreateDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    JoinColumn: decorator,
    ManyToOne: (typeFn?: () => unknown, inverseFn?: (value: any) => unknown) => {
      typeFn?.();
      inverseFn?.({ employees: [] });
      return () => undefined;
    },
    PrimaryGeneratedColumn: decorator,
    UpdateDateColumn: decorator,
  };
}, { virtual: true });
import { ExportFormat, ExportStatus } from '../exports/export.enums';
import { FixedAsset } from '../fixed-assets/entities/fixed-asset.entity';
import { Employee } from '../hr/entities/employee.entity';
import { Payroll } from '../hr/entities/payroll.entity';
import { CreateCurrencyDto, ExchangeRateDto, UpdateExchangeRateDto } from '../currencies/dto';
import { CreateApprovalRuleDto } from '../approvals/dto/create-approval-rule.dto';
import { RegisterDto } from '../auth/dto';
import { LoginDto } from '../auth/dto/login.dto';
import { BomItemResponse } from '../manufacturing/dto/bom-item.response.dto';
import { CreateNotificationDto, MarkReadDto } from '../notifications/dto/notification.dto';
import { CreateInspectionPlanDto, CreateNCRDto, CreateCAPADto } from '../qms/dto';
import { CreateReportTemplateDto, RunReportDto } from '../reports/dto/create-report-template.dto';
import { Tenant } from '../tenants/tenants.entity';
import { CreateTenantDto } from '../tenants/dto/create-tenant.dto';
import { UpdateTenantDto } from '../tenants/dto/update-tenant.dto';
import { CreateLeadDto } from '../crm/leads/dto/create-lead.dto';
import { UpdateLeadDto } from '../crm/leads/dto/update-lead.dto';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { UpdateCustomerDto } from '../customers/dto/update-customer.dto';
import { CreateEmployeeDto } from '../hr/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../hr/dto/update-employee.dto';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';
import { CreatePoFromReorderDto } from '../purchasing/dto/create-po-from-reorder.dto';
import { CreatePurchaseOrderDto } from '../purchasing/dto/create-purchase-order.dto';
import { QueryProductDto } from '../products/dto/query-product.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { CreateSupplierDto } from '../suppliers/dto/create-supplier.dto';
import { UpdateSupplierDto } from '../suppliers/dto/update-supplier.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import * as manufacturingDto from '../manufacturing/dto';
import { PaginationParamsDto } from '../manufacturing/dto/pagination.dto';
import { QueryActivityDto } from '../modules/activity/dto/query-activity.dto';
import { CreateWarehouseTransferDto } from '../warehouses/dto';
import { helpdeskSchema } from '../helpdesk/entities/ticket.entity';
import { projectSchema } from '../projects/entities/project.entity';
import { plainToInstance } from 'class-transformer';

describe('entity, DTO, and enum coverage', () => {
  it('loads domain entities and assigns business fields', () => {
    const asset = Object.assign(new FixedAsset(), { code: 'FA-1', status: 'active' });
    const tenant = Object.assign(new Tenant(), { id: 1, name: 'Acme', slug: 'acme' });
    const employee = Object.assign(new Employee(), { code: 'E-1', tenantId: 'tenant-1' });
    const payroll = Object.assign(new Payroll(), { employee, month: '05', netSalary: 1000 });

    expect(asset).toMatchObject({ code: 'FA-1', status: 'active' });
    expect(tenant).toMatchObject({ id: 1, slug: 'acme' });
    expect(employee).toMatchObject({ code: 'E-1', tenantId: 'tenant-1' });
    expect(payroll.employee).toBe(employee);
  });

  it('loads report/manufacturing DTOs and export enums', () => {
    const template = Object.assign(new CreateReportTemplateDto(), {
      name: 'Sales',
      parameters: { region: 'south' },
      querySql: 'select 1',
    });
    const run = Object.assign(new RunReportDto(), { templateId: 'template-1' });
    const bom = Object.assign(new BomItemResponse(), {
      componentProductName: 'Milk',
      id: 'bom-1',
      quantity: 2,
    });

    expect(template.parameters).toEqual({ region: 'south' });
    expect(run.templateId).toBe('template-1');
    expect(bom.quantity).toBe(2);
    expect(ExportFormat.ZIP).toBe('zip');
    expect(ExportStatus.COMPLETED).toBe('completed');
  });

  it('instantiates product, manufacturing, and warehouse DTOs plus SQL schema constants', () => {
    const query = Object.assign(new QueryProductDto(), { search: 'milk' });
    const product = Object.assign(new CreateProductDto(), {
      categoryId: '00000000-0000-4000-8000-000000000001',
      imageUrl: 'https://cdn.test/p.png',
      name: 'Milk',
      price: 10000,
    });
    const pagination = Object.assign(new PaginationParamsDto(), { limit: 20, page: 1 });
    const transfer = Object.assign(new CreateWarehouseTransferDto(), {
      fromWarehouseId: 'wh-1',
      items: [{ productId: 'product-1', quantity: 2 }],
      toWarehouseId: 'wh-2',
    });
    const transformedQuery = plainToInstance(QueryProductDto, {
      isActive: 'true',
      limit: '50',
      maxPrice: '20000',
      minPrice: '10000',
      page: '2',
    });
    const transformedProduct = plainToInstance(CreateProductDto, {
      cost: '7000',
      name: 'Milk',
      price: '10000',
      stock: '5',
    });
    const transformedActivity = plainToInstance(QueryActivityDto, { limit: '10', page: '3' });

    expect(new QueryProductDto()).toMatchObject({ page: 1, limit: 20 });
    expect(query.search).toBe('milk');
    expect(product.categoryId).toBe('00000000-0000-4000-8000-000000000001');
    expect(pagination.limit).toBe(20);
    expect(transfer.items).toHaveLength(1);
    expect(transformedQuery).toMatchObject({ minPrice: 10000, maxPrice: 20000, page: 2, limit: 50 });
    expect(transformedProduct).toMatchObject({ price: 10000, cost: 7000, stock: 5 });
    expect(transformedActivity).toMatchObject({ page: 3, limit: 10 });
    expect(helpdeskSchema).toContain('CREATE TABLE IF NOT EXISTS tickets');
    expect(projectSchema).toContain('CREATE TABLE IF NOT EXISTS projects');
  });

  it('executes nested and numeric DTO transformers used by request validation', () => {
    const lead = plainToInstance(CreateLeadDto, { firstName: 'Lan', lastName: 'Nguyen', leadScore: '80' });
    const customer = plainToInstance(CreateCustomerDto, { code: 'C001', name: 'Lan', debtLimit: '5000000' });
    const order = plainToInstance(CreateOrderDto, {
      items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 2, unitPrice: 10000 }],
    });
    const payment = plainToInstance(CreatePaymentDto, { type: 'receipt', amount: '10000', method: 'cash' });
    const reorder = plainToInstance(CreatePoFromReorderDto, {
      supplierId: '00000000-0000-4000-8000-000000000002',
      items: [{ productId: '00000000-0000-4000-8000-000000000003', quantity: 3 }],
    });
    const purchaseOrder = plainToInstance(CreatePurchaseOrderDto, {
      items: [{ productId: '00000000-0000-4000-8000-000000000004', orderedQty: 4, unitCost: 7000 }],
    });
    const warehouseTransfer = plainToInstance(CreateWarehouseTransferDto, {
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
      items: [{ productId: 'product-1', quantity: 2 }],
    });
    const currency = Object.assign(new CreateCurrencyDto(), { code: 'USD', name: 'US Dollar', symbol: '$' });
    const exchangeRate = Object.assign(new ExchangeRateDto(), { fromCurrency: 'USD', toCurrency: 'VND', rate: 25000 });
    const updateRate = Object.assign(new UpdateExchangeRateDto(), { rate: 25200 });

    expect(lead.leadScore).toBe(80);
    expect(customer.debtLimit).toBe(5000000);
    expect(order.items[0]).toBeInstanceOf(CreateOrderItemDtoFrom(order));
    expect(payment.amount).toBe(10000);
    expect(reorder.items[0].quantity).toBe(3);
    expect(purchaseOrder.items[0].orderedQty).toBe(4);
    expect(warehouseTransfer.items[0].quantity).toBe(2);
    expect(currency.code).toBe('USD');
    expect(exchangeRate.rate).toBe(25000);
    expect(updateRate.rate).toBe(25200);

    expect(new manufacturingDto.CreateBomItemDto()).toBeInstanceOf(manufacturingDto.CreateBomItemDto);
    expect(new manufacturingDto.CreateProductionOrderDto()).toBeInstanceOf(manufacturingDto.CreateProductionOrderDto);
    expect(new manufacturingDto.UpdateQCCheckpointDto()).toBeInstanceOf(manufacturingDto.UpdateQCCheckpointDto);
    expect(new manufacturingDto.CalculateCostDto()).toBeInstanceOf(manufacturingDto.CalculateCostDto);
    expect(new manufacturingDto.BomItemResponse()).toBeInstanceOf(manufacturingDto.BomItemResponse);
    expect(new manufacturingDto.ProductionOrderResponse()).toBeInstanceOf(manufacturingDto.ProductionOrderResponse);
    expect(new manufacturingDto.QCCheckpointResponse()).toBeInstanceOf(manufacturingDto.QCCheckpointResponse);
    expect(new manufacturingDto.ProductionCostResponse()).toBeInstanceOf(manufacturingDto.ProductionCostResponse);
  });

  it('loads remaining request DTO classes and partial update DTO wrappers', () => {
    const approvalRule = Object.assign(new CreateApprovalRuleDto(), {
      documentType: 'purchase_order',
      isActive: true,
      name: 'High value PO',
      priority: 1,
    });
    const login = Object.assign(new LoginDto(), { email: 'admin@demo.com', password: 'Admin@123456' });
    const register = Object.assign(new RegisterDto(), { email: 'owner@demo.com', password: 'Admin@123456', name: 'Owner' });
    const notification = Object.assign(new CreateNotificationDto(), {
      message: 'Ready',
      title: 'PO approved',
      type: 'approval',
      userId: '00000000-0000-4000-8000-000000000001',
    });
    const markRead = Object.assign(new MarkReadDto(), {
      notificationId: '00000000-0000-4000-8000-000000000002',
    });
    const inspectionPlan = Object.assign(new CreateInspectionPlanDto(), {
      name: 'Incoming beans',
      productId: 'product-1',
      samplingRule: 'AQL 1.0',
    });
    const ncr = Object.assign(new CreateNCRDto(), {
      defectCode: 'BROKEN-SEAL',
      description: 'Seal was broken',
      productId: 'product-1',
      productionOrderId: 'mo-1',
      severity: 'high',
    });
    const capa = Object.assign(new CreateCAPADto(), {
      action: 'Replace sealing step',
      ncrId: 'ncr-1',
      type: 'corrective',
    });
    const supplier = Object.assign(new CreateSupplierDto(), { code: 'SUP-1', name: 'Coffee Farm', isActive: true });
    const tenant = Object.assign(new CreateTenantDto(), { name: 'Demo Tenant', slug: 'demo-tenant' });
    const user = Object.assign(new CreateUserDto(), { email: 'user@demo.com', password: 'Admin@123456' });
    const employee = Object.assign(new CreateEmployeeDto(), { code: 'E-2', name: 'Minh', salary: 12000000 });

    expect(approvalRule.priority).toBe(1);
    expect(login.email).toBe('admin@demo.com');
    expect(register.name).toBe('Owner');
    expect(notification.type).toBe('approval');
    expect(markRead.notificationId).toContain('00000000');
    expect(inspectionPlan.samplingRule).toBe('AQL 1.0');
    expect(ncr.severity).toBe('high');
    expect(capa.type).toBe('corrective');
    expect(supplier.isActive).toBe(true);
    expect(tenant.slug).toBe('demo-tenant');
    expect(user.email).toBe('user@demo.com');
    expect(employee.salary).toBe(12000000);

    expect(Object.assign(new UpdateLeadDto(), { status: 'qualified' })).toBeInstanceOf(UpdateLeadDto);
    expect(Object.assign(new UpdateCustomerDto(), { name: 'Updated' })).toBeInstanceOf(UpdateCustomerDto);
    expect(Object.assign(new UpdateProductDto(), { translations: { vi: { description: 'Sua' } } })).toBeInstanceOf(
      UpdateProductDto,
    );
    expect(Object.assign(new UpdateSupplierDto(), { name: 'Updated supplier' })).toBeInstanceOf(UpdateSupplierDto);
    expect(Object.assign(new UpdateTenantDto(), { name: 'Updated tenant' })).toBeInstanceOf(UpdateTenantDto);
    expect(Object.assign(new UpdateUserDto(), { name: 'Updated user' })).toBeInstanceOf(UpdateUserDto);
    expect(Object.assign(new UpdateEmployeeDto(), { position: 'QA' })).toBeInstanceOf(UpdateEmployeeDto);
  });

  it('loads compatibility-only re-export modules', async () => {
    await expect(import('../interfaces/request-with-user.interface')).resolves.toEqual({});
    await expect(import('../auth/dto/register.dto')).resolves.toHaveProperty('RegisterDto');
  });
});

const CreateOrderItemDtoFrom = (order: CreateOrderDto) => order.items[0].constructor as new () => unknown;
