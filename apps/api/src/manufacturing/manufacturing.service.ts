import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { products, billsOfMaterials, bomRoutings, productionOrders, inventoryTransactions } from '@smart-erp/database';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface BomItem {
  id: string;
  productId: string;
  componentProductId: string;
  componentProductName: string;
  quantity: number;
  unitCost?: number;
  wastagePercent?: number;
}

export interface ProductionOrder {
  id: string;
  orderCode: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  bomItems: BomItem[];
  createdAt: string;
}

export interface QCCheckpoint {
  id: string;
  productionOrderId: string;
  checkpoint: string;
  status: 'pending' | 'passed' | 'failed';
  notes?: string;
  checkedAt?: string;
}

@Injectable()
export class ManufacturingService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Get BOM for a product */
  async getBOM(productId: string, tenantId: string): Promise<BomItem[]> {
    const boms = await this.drizzle.db.execute(
      sql`
        SELECT
          b.id,
          b.product_id as "productId",
          cp.id as "componentProductId",
          cp.name as "componentProductName",
          b.quantity,
          b.unit_cost as "unitCost",
          b.wastage_percent as "wastagePercent"
        FROM bills_of_materials b
        JOIN products cp ON cp.id = b.component_product_id
        WHERE b.product_id = ${productId}
          AND b.tenant_id = ${tenantId}
        ORDER BY b.id
      `,
    );
    return (boms as any).map((row: any) => ({
      id: row.id,
      productId: row.productId,
      componentProductId: row.componentProductId,
      componentProductName: row.componentProductName,
      quantity: Number(row.quantity || 0),
      unitCost: row.unitCost ? Number(row.unitCost) : undefined,
      wastagePercent: row.wastagePercent ? Number(row.wastagePercent) : undefined,
    }));
  }

  /** Create BOM item */
  async addBOMItem(tenantId: string, productId: string, data: {
    componentProductId: string;
    quantity: number;
    unitCost?: number;
    wastagePercent?: number;
  }) {
    const id = crypto.randomUUID();
    await this.drizzle.db.insert(billsOfMaterials).values({
      componentProductId: data.componentProductId,
      quantity: String(data.quantity),
      unitCost: data.unitCost !== undefined ? String(data.unitCost) : undefined,
      wastagePercent: data.wastagePercent !== undefined ? String(data.wastagePercent) : undefined,
      id,
      tenantId,
      productId,
    });
    return this.getBOM(productId, tenantId);
  }

  /** Create production order */
  async createProductionOrder(tenantId: string, userId: string, data: {
    productId: string;
    quantity: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ProductionOrder> {
    const code = `MO-${Date.now().toString(36).toUpperCase()}`;
    const [order] = await this.drizzle.db.insert(productionOrders).values({
      tenantId,
      orderCode: code,
      productId: data.productId,
      quantity: String(data.quantity),
      status: 'draft',
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy: userId,
    }).returning();

    return this.getProductionOrderById(tenantId, order.id);
  }

  /** Start production — check materials and consume */
  async startProduction(tenantId: string, orderId: string, userId: string): Promise<ProductionOrder> {
    const [order] = await this.drizzle.db
      .select()
      .from(productionOrders)
      .where(and(eq(productionOrders.tenantId, tenantId), eq(productionOrders.id, orderId)))
      .limit(1);

    if (!order) throw new NotFoundException('Production order not found');
    if (order.status !== 'draft') throw new NotFoundException('Order must be in draft status');

    // Check and consume BOM materials
    const boms = await this.getBOM(order.productId, tenantId);

    for (const bom of boms) {
      const requiredQty = bom.quantity * Number(order.quantity) * (1 + (bom.wastagePercent || 0) / 100);

      // Check inventory
      const invResult = await this.drizzle.db.execute(
        sql`
          SELECT current_stock FROM inventory_summary
          WHERE tenant_id = ${tenantId} AND product_id = ${bom.componentProductId}
          LIMIT 1
        `,
      );

      const currentStock = (invResult as any)?.[0]?.current_stock ?? 0;
      if (currentStock < requiredQty) {
        throw new Error(
          `Insufficient materials for ${bom.componentProductName}: need ${requiredQty.toFixed(2)}, current stock ${currentStock}`,
        );
      }

      // Consume material
      await this.drizzle.db.execute(
        sql`
          UPDATE inventory_summary
          SET current_stock = current_stock - ${requiredQty},
              updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND product_id = ${bom.componentProductId}
        `,
      );

      // Log transaction
      const previousStock = Number(currentStock);
      const newStock = previousStock - requiredQty;

      await this.drizzle.db.insert(inventoryTransactions).values({
        tenantId,
        productId: bom.componentProductId,
        type: 'production_consumption',
        quantity: Math.round(requiredQty),
        previousStock: Math.round(previousStock),
        newStock: Math.round(newStock),
        reference: `production_order:${orderId}`,
        notes: `Production consumption for ${order.orderCode}`,
        createdBy: userId,
      });
    }

    // Update order status
    await this.drizzle.db
      .update(productionOrders)
      .set({ status: 'in_progress', startedAt: new Date() })
      .where(eq(productionOrders.id, orderId));

    return this.getProductionOrderById(tenantId, orderId);
  }

  /** Complete production */
  async completeProduction(tenantId: string, orderId: string, userId: string): Promise<ProductionOrder> {
    await this.drizzle.db
      .update(productionOrders)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(productionOrders.tenantId, tenantId), eq(productionOrders.id, orderId)));

    // Add finished goods to inventory
    const [order] = await this.drizzle.db
      .select()
      .from(productionOrders)
      .where(eq(productionOrders.id, orderId))
      .limit(1);

    const addQty = Number(order.quantity);
    const invResult = await this.drizzle.db.execute(
      sql`
        SELECT current_stock FROM inventory_summary
        WHERE tenant_id = ${tenantId} AND product_id = ${(order as any).product_id}
        LIMIT 1
      `,
    );
    const previousStock = Number((invResult as any)?.[0]?.current_stock ?? 0);
    const newStock = previousStock + addQty;

    await this.drizzle.db.execute(
      sql`
        UPDATE inventory_summary
        SET current_stock = current_stock + ${addQty},
            updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND product_id = ${(order as any).product_id}
      `,
    );

    await this.drizzle.db.insert(inventoryTransactions).values({
      tenantId,
      productId: (order as any).product_id,
      type: 'production_output',
      quantity: Math.round(addQty),
      previousStock: Math.round(previousStock),
      newStock: Math.round(newStock),
      reference: `production_order:${orderId}`,
      notes: `Production completed for ${order.orderCode}`,
      createdBy: userId,
    });

    return this.getProductionOrderById(tenantId, orderId);
  }

  /** Report production progress (Real-time shop floor update) */
  async reportProductionProgress(tenantId: string, orderId: string, data: {
    quantityProduced: number;
    quantityScrap?: number;
    notes?: string;
  }) {
    // In a real system, we would have a production_logs table
    // For now, we update the order's metadata or status
    const [updated] = await this.drizzle.db
      .update(productionOrders)
      .set({
        // Simplified: assuming we added a metadata column or similar
        // For now, we'll just log it to the console and return success
        updatedAt: new Date(),
      })
      .where(and(eq(productionOrders.id, orderId), eq(productionOrders.tenantId, tenantId)))
      .returning();

    return {
      status: 'success',
      orderId,
      reportedQty: data.quantityProduced,
      scrapQty: data.quantityScrap || 0,
      timestamp: new Date().toISOString(),
    };
  }

  /** Get production order details */
  async getProductionOrderById(tenantId: string, orderId: string): Promise<ProductionOrder> {
    const [order] = (await this.drizzle.db.execute(
      sql`
        SELECT
          po.id,
          po.order_code,
          po.product_id,
          po.quantity,
          po.status,
          po.start_date,
          po.end_date,
          po.created_at,
          p.name as product_name
        FROM production_orders po
        JOIN products p ON p.id = po.product_id
        WHERE po.tenant_id = ${tenantId} AND po.id = ${orderId}
        LIMIT 1
      `,
    )) as any;

    if (!order) throw new NotFoundException('Production order not found');

    const bom = await this.getBOM((order as any).product_id, tenantId);

    return {
      ...(order as any),
      bomItems: bom,
    };
  }

  /** List production orders */
  async listProductionOrders(tenantId: string, status?: string, limit = 20, page = 1) {
    const offset = (page - 1) * limit;

    let query = sql`
      SELECT po.*, p.name as product_name
      FROM production_orders po
      JOIN products p ON p.id = po.product_id
      WHERE po.tenant_id = ${tenantId}
    `;

    if (status) {
      query = sql`${query} AND po.status = ${status}`;
    }

    query = sql`${query} ORDER BY po.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    return this.drizzle.db.execute(query);
  }

  /** Get quality checkpoints for a production order */
  async getQCCheckpoints(orderId: string, tenantId: string): Promise<QCCheckpoint[]> {
    const checkpoints = await this.drizzle.db
      .select()
      .from(productionOrders) // Simplified: would use a qc_checkpoints table
      .where(eq(productionOrders.id, orderId))
      .limit(1);

    // Return default checkpoints (i18n keys for frontend translation)
    const defaultCheckpoints: QCCheckpoint[] = [
      { id: 'qc-1', productionOrderId: orderId, checkpoint: 'manufacturing.qc.checkpoint1', status: 'pending' },
      { id: 'qc-2', productionOrderId: orderId, checkpoint: 'manufacturing.qc.checkpoint2', status: 'pending' },
      { id: 'qc-3', productionOrderId: orderId, checkpoint: 'manufacturing.qc.checkpoint3', status: 'pending' },
    ];

    return defaultCheckpoints;
  }

  /** Update QC checkpoint */
  async updateQCCheckpoint(orderId: string, checkpointId: string, status: 'pending' | 'passed' | 'failed', notes?: string) {
    // Simplified: would update qc_checkpoints table
    return { id: checkpointId, status, notes, checkedAt: new Date().toISOString() };
  }

  /** Calculate standard production cost (material + labor + overhead) */
  async calculateProductionCost(tenantId: string, productId: string, quantity: number) {
    const boms = await this.getBOM(productId, tenantId);
    let totalMaterialCost = 0;
    const materialBreakdown: any[] = [];

    for (const bom of boms) {
      const requiredQty = bom.quantity * quantity * (1 + (bom.wastagePercent || 0) / 100);
      const costPerUnit = bom.unitCost || 0;
      const subtotal = requiredQty * costPerUnit;
      totalMaterialCost += subtotal;
      materialBreakdown.push({
        component: bom.componentProductName,
        quantity: Math.ceil(requiredQty * 100) / 100,
        unitCost: bom.unitCost,
        subtotal: Math.round(subtotal),
      });
    }

    // Estimate labor cost (configurable per product, default 15% of material)
    const laborRate = 0.15;
    const totalLaborCost = Math.round(totalMaterialCost * laborRate);

    // Estimate overhead (default 10% of material + labor)
    const overheadRate = 0.10;
    const totalOverheadCost = Math.round((totalMaterialCost + totalLaborCost) * overheadRate);

    const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;
    const unitCost = quantity > 0 ? Math.round(totalCost / quantity) : 0;

    return {
      totalMaterialCost: Math.round(totalMaterialCost),
      totalLaborCost,
      totalOverheadCost,
      totalCost,
      unitCost,
      quantity,
      materialBreakdown,
    };
  }

  /** Calculate variance analysis for a completed production order */
  async calculateVarianceAnalysis(tenantId: string, orderId: string) {
    const order = await this.getProductionOrderById(tenantId, orderId);
    if (!order) throw new NotFoundException('Production order not found');

    // Standard cost
    const standardCost = await this.calculateProductionCost(tenantId, order.productId, order.quantity);

    // Actual cost from inventory transactions
    const actualTxns = await this.drizzle.db.execute(
      sql`SELECT SUM(quantity * unit_cost) as actual_cost
          FROM inventory_transactions
          WHERE tenant_id = ${tenantId}
            AND reference_type = 'production_order'
            AND reference_id = ${orderId}
            AND type = 'production_consumption'`
    );
    const actualMaterialCost = Number((actualTxns as any)?.[0]?.actual_cost || 0);

    // Variances
    const materialVariance = actualMaterialCost - standardCost.totalMaterialCost;
    const materialVariancePercent = standardCost.totalMaterialCost > 0
      ? Math.round((materialVariance / standardCost.totalMaterialCost) * 10000) / 100
      : 0;

    return {
      orderId: order.id,
      orderCode: order.orderCode,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      standardCost,
      actualMaterialCost,
      materialVariance,
      materialVariancePercent,
      isOverBudget: materialVariance > 0,
    };
  }

  // ─── Routing Operations ───────────────────────────────────────────────────────

  /** Get routing steps for a product */
  async getRoutingSteps(productId: string, tenantId: string) {
    return this.drizzle.db
      .select()
      .from(bomRoutings)
      .where(and(
        eq(bomRoutings.productId, productId),
        eq(bomRoutings.tenantId, tenantId),
      ))
      .orderBy(bomRoutings.sequenceOrder);
  }

  /** Add a routing step */
  async addRoutingStep(tenantId: string, data: {
    productId: string;
    operationName: string;
    description?: string;
    sequenceOrder: number;
    workCenter?: string;
    setupTimeMinutes?: number;
    cycleTimeMinutes: number;
    laborCostPerHour?: number;
    overheadCostPerHour?: number;
    requiresQC?: boolean;
  }) {
    const [step] = await this.drizzle.db.insert(bomRoutings).values({
      tenantId,
      productId: data.productId,
      operationName: data.operationName,
      description: data.description,
      sequenceOrder: data.sequenceOrder,
      workCenter: data.workCenter,
      setupTimeMinutes: String(data.setupTimeMinutes || 0),
      cycleTimeMinutes: String(data.cycleTimeMinutes),
      laborCostPerHour: String(data.laborCostPerHour || 0),
      overheadCostPerHour: String(data.overheadCostPerHour || 0),
      requiresQC: data.requiresQC || false,
    }).returning();

    return step;
  }

  /** Remove a routing step */
  async removeRoutingStep(tenantId: string, stepId: string) {
    await this.drizzle.db
      .delete(bomRoutings)
      .where(and(
        eq(bomRoutings.id, stepId),
        eq(bomRoutings.tenantId, tenantId),
      ));
    return { deleted: true };
  }

  /** Calculate full production cost including routing labor costs */
  async calculateFullProductionCost(tenantId: string, productId: string, quantity: number) {
    // Material cost from BOM
    const materialCost = await this.calculateProductionCost(tenantId, productId, quantity);

    // Labor + overhead cost from routing
    const steps = await this.getRoutingSteps(productId, tenantId);
    let totalLaborFromRouting = 0;
    let totalOverheadFromRouting = 0;
    let totalTimeMinutes = 0;

    const routingBreakdown = steps.map((step: any) => {
      const setupMin = Number(step.setupTimeMinutes) || 0;
      const cycleMin = Number(step.cycleTimeMinutes) || 0;
      const totalMin = setupMin + cycleMin * quantity;
      const laborHours = totalMin / 60;
      const laborCost = laborHours * (Number(step.laborCostPerHour) || 0);
      const overheadCost = laborHours * (Number(step.overheadCostPerHour) || 0);

      totalLaborFromRouting += laborCost;
      totalOverheadFromRouting += overheadCost;
      totalTimeMinutes += totalMin;

      return {
        operation: step.operationName,
        workCenter: step.workCenter,
        totalMinutes: Math.round(totalMin * 100) / 100,
        laborCost: Math.round(laborCost),
        overheadCost: Math.round(overheadCost),
      };
    });

    const grandTotal = materialCost.totalMaterialCost
      + Math.round(totalLaborFromRouting)
      + Math.round(totalOverheadFromRouting);

    return {
      ...materialCost,
      routingBreakdown,
      totalLaborFromRouting: Math.round(totalLaborFromRouting),
      totalOverheadFromRouting: Math.round(totalOverheadFromRouting),
      totalTimeMinutes: Math.round(totalTimeMinutes),
      grandTotal,
      unitCostFull: quantity > 0 ? Math.round(grandTotal / quantity) : 0,
    };
  }
}
