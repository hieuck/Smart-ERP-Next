import * as attendance from './attendance';
import * as billsOfMaterials from './bills_of_materials';
import * as crm from './crm';
import * as crmLeads from './crm_leads';
import * as ecommerceStores from './ecommerce_stores';
import * as eInvoices from './e_invoices';
import * as finance from './finance';
import * as hrPerformance from './hr_performance';
import * as maintenance from './maintenance';
import * as orders from './orders';
import * as payroll from './payroll';
import * as projects from './projects';
import * as purchaseOrders from './purchase_orders';
import * as qms from './qms';
import * as scm from './scm';
import * as tms from './tms';
import * as warehouseTasks from './warehouse_tasks';
import * as warehouseTransfers from './warehouse_transfers';
import * as warehouseWms from './warehouse_wms';
import * as wms from './wms';
import * as schemaIndex from './index';
import { getTableConfig } from 'drizzle-orm/pg-core';

const isDrizzleTable = (value: unknown) =>
  !!value &&
  typeof value === 'object' &&
  Object.getOwnPropertySymbols(value).some((symbol) => String(symbol) === 'Symbol(drizzle:IsDrizzleTable)' && (value as any)[symbol]);

describe('database schema import coverage', () => {
  it('loads operational schema modules and table definitions', () => {
    expect(projects.projects).toBeDefined();
    expect(projects.projectTasks).toBeDefined();
    expect(projects.projectTimesheets).toBeDefined();
    expect(projects.projectTaskDependencies).toBeDefined();
    expect(projects.projectMembers).toBeDefined();
    expect(warehouseTasks.warehouseTasks).toBeDefined();
    expect(warehouseWms.warehouseLocations).toBeDefined();
    expect(warehouseWms.warehouseTaskItems).toBeDefined();
    expect(crm.leads).toBeDefined();
    expect(crm.crmPipelines).toBeDefined();
    expect(crm.crmStages).toBeDefined();
    expect(crm.crmDeals).toBeDefined();
    expect(qms.qmsInspectionPlans).toBeDefined();
    expect(qms.qmsInspections).toBeDefined();
    expect(qms.qmsNcrs).toBeDefined();
    expect(attendance.workShifts).toBeDefined();
    expect(attendance.attendanceRecords).toBeDefined();
    expect(attendance.leaveRequests).toBeDefined();
    expect(hrPerformance.performanceReviews).toBeDefined();
    expect(tms.tmsVehicles).toBeDefined();
    expect(tms.tmsTrips).toBeDefined();
    expect(wms.warehouseTasks).toBeDefined();
    expect(eInvoices.eInvoices).toBeDefined();
    expect(orders.orders).toBeDefined();
    expect(payroll.salaryBoards).toBeDefined();
    expect(billsOfMaterials.billsOfMaterials).toBeDefined();
    expect(ecommerceStores.ecommerceStores).toBeDefined();
    expect(finance.financeBudgets).toBeDefined();
    expect(maintenance.maintenanceOrders).toBeDefined();
    expect(scm.supplierLeadTimes).toBeDefined();
    expect(warehouseTransfers.warehouseTransfers).toBeDefined();
    expect(purchaseOrders.purchaseOrders).toBeDefined();
    expect(crmLeads.crmLeads).toBeDefined();
  });

  it('materializes table configs so deferred indexes and references are exercised', () => {
    const tables = Array.from(new Set([
      attendance.workShifts,
      attendance.attendanceRecords,
      attendance.leaveRequests,
      billsOfMaterials.billsOfMaterials,
      crm.leads,
      crm.crmPipelines,
      crm.crmStages,
      crm.crmDeals,
      crmLeads.crmLeads,
      ecommerceStores.ecommerceStores,
      eInvoices.eInvoices,
      finance.financeBudgets,
      hrPerformance.kpiDefinitions,
      hrPerformance.employeeKpiTargets,
      hrPerformance.performanceReviews,
      maintenance.maintenanceOrders,
      orders.orders,
      payroll.salaryBoards,
      projects.projects,
      projects.projectTasks,
      projects.projectTimesheets,
      projects.projectTaskDependencies,
      projects.projectMembers,
      purchaseOrders.purchaseOrders,
      qms.qmsInspectionPlans,
      qms.qmsInspections,
      qms.qmsNcrs,
      scm.supplierLeadTimes,
      tms.tmsVehicles,
      tms.tmsTrips,
      tms.tmsTripStops,
      warehouseTasks.warehouseTasks,
      warehouseTransfers.warehouseTransfers,
      warehouseWms.warehouseLocations,
      warehouseWms.warehouseTaskItems,
      wms.warehouseLocations,
      wms.warehouseTasks,
      wms.warehouseTaskItems,
      ...Object.values(schemaIndex).filter(isDrizzleTable),
    ]));

    for (const table of tables) {
      const config = getTableConfig(table as any);
      expect(config.columns.length).toBeGreaterThan(0);
      for (const foreignKey of config.foreignKeys) {
        const reference = foreignKey.reference();
        expect(reference.foreignColumns.length).toBeGreaterThan(0);
      }
    }
  });
});
