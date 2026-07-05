import {
  DataContractDefinition,
  DataContractSignOff,
  createDataContractId,
} from "./data-contracts";

function makeSignOffs(area: string): DataContractSignOff[] {
  return [
    { role: "Product Manager", evidence: `${area} KPI reviewed.` },
    {
      role: "Business Analyst / Domain SME",
      evidence: `${area} business rules approved.`,
    },
    {
      role: "Data Engineer / Analytics",
      evidence: `${area} schema, lineage, and quality checks reviewed.`,
    },
    { role: "QA Engineer / SDET", evidence: `${area} tests mapped.` },
    {
      role: "Security Engineer",
      evidence: `${area} PII classification approved.`,
    },
  ];
}

export const SMART_ERP_DATA_CONTRACTS: readonly DataContractDefinition[] = [
  {
    contractId: createDataContractId("sales", "order-facts"),
    owner: "Data Engineer / Analytics",
    businessOwner: "Product Manager - Sales",
    sourceSystem: "orders service + order_items table",
    consumers: ["Sales dashboard", "Revenue reports", "Demand forecast job"],
    refreshCadence: "hourly",
    retention: "7 years, then archived by data archival policy",
    piiClassification: "Internal",
    changePolicy:
      "Backward-compatible additions only; breaking changes require a 30-day deprecation window.",
    fields: [
      {
        name: "order_id",
        type: "string",
        nullable: false,
        description: "Stable order identifier scoped to tenant.",
        validationRule: "Unique per tenant and non-empty.",
        piiClass: "Public",
      },
      {
        name: "customer_id",
        type: "string",
        nullable: true,
        description:
          "Customer identifier for segmentation and repeat-purchase analytics.",
        validationRule: "Must reference an existing customer when present.",
        piiClass: "Internal",
      },
      {
        name: "net_revenue",
        type: "number",
        nullable: false,
        description: "Order revenue after discounts and before refunds.",
        validationRule:
          "Must be greater than or equal to 0 and reconcile with order lines.",
        piiClass: "Public",
      },
    ],
    qualityChecks: {
      freshnessSla: "New paid orders appear in analytics within 60 minutes.",
      completeness:
        "Daily order count reconciles with the orders source table.",
      accuracy:
        "Revenue total equals accepted order line totals minus discounts.",
      uniqueness: "order_id is unique per tenant.",
      drift:
        "Alert when daily revenue changes by more than 40% without a release or campaign note.",
    },
    operationalEvidence: [
      "pnpm test:api:integration",
      "Sales revenue dashboard freshness panel",
    ],
    signOffs: makeSignOffs("Sales order facts"),
  },
  {
    contractId: createDataContractId("inventory", "stock-snapshots"),
    owner: "Data Engineer / Analytics",
    businessOwner: "Product Manager - Inventory",
    sourceSystem: "inventory transactions + products tables",
    consumers: [
      "Inventory dashboard",
      "Low-stock alerts",
      "Purchasing suggestions",
    ],
    refreshCadence: "hourly",
    retention: "3 years online, then archived by data archival policy",
    piiClassification: "Public",
    changePolicy:
      "Backward-compatible additions only; renamed metrics require dashboard migration notes.",
    fields: [
      {
        name: "product_id",
        type: "string",
        nullable: false,
        description: "Stable product identifier.",
        validationRule: "Must reference an active or archived product.",
        piiClass: "Public",
      },
      {
        name: "warehouse_id",
        type: "string",
        nullable: false,
        description: "Warehouse where the stock snapshot was measured.",
        validationRule: "Must reference an existing warehouse.",
        piiClass: "Public",
      },
      {
        name: "available_quantity",
        type: "number",
        nullable: false,
        description: "Quantity available after reservations.",
        validationRule: "Must reconcile with on-hand minus reserved quantity.",
        piiClass: "Public",
      },
    ],
    qualityChecks: {
      freshnessSla:
        "Stock snapshots update within 60 minutes of inventory movement.",
      completeness:
        "Every active product/warehouse pair has a snapshot or explicit zero-stock record.",
      accuracy:
        "Available quantity reconciles with inventory transactions and reservations.",
      uniqueness: "product_id + warehouse_id + snapshot_date is unique.",
      drift:
        "Alert when negative stock ratio increases by more than 5 percentage points day over day.",
    },
    operationalEvidence: [
      "pnpm test:api:integration",
      "Inventory reconciliation report",
    ],
    signOffs: makeSignOffs("Inventory stock snapshots"),
  },
  {
    contractId: createDataContractId("forecast", "demand-signals"),
    owner: "Data Engineer / Analytics",
    businessOwner: "Product Manager - Forecast",
    sourceSystem: "orders service + forecast cache",
    consumers: [
      "Demand forecast API",
      "Purchasing suggestions",
      "Forecast accuracy monitoring",
    ],
    refreshCadence: "daily",
    retention: "2 years for model evaluation and backtesting",
    piiClassification: "Public",
    changePolicy:
      "Feature additions require model evaluation notes; breaking changes require retraining sign-off.",
    fields: [
      {
        name: "product_id",
        type: "string",
        nullable: false,
        description: "Product being forecast.",
        validationRule: "Must reference an existing product.",
        piiClass: "Public",
      },
      {
        name: "forecast_date",
        type: "date",
        nullable: false,
        description: "Date the demand signal applies to.",
        validationRule: "Must be a valid ISO date.",
        piiClass: "Public",
      },
      {
        name: "predicted_quantity",
        type: "number",
        nullable: false,
        description: "Predicted demand quantity for the product/date.",
        validationRule: "Must be greater than or equal to 0.",
        piiClass: "Public",
      },
    ],
    qualityChecks: {
      freshnessSla:
        "Demand signals refresh before the daily purchasing planning window.",
      completeness:
        "At least 80% of active SKUs have a forecast when enough order history exists.",
      accuracy: "MAPE and MAE are monitored against forecast accuracy targets.",
      uniqueness: "product_id + forecast_date is unique.",
      drift:
        "Alert when forecast bias moves outside -5% to +5% for two consecutive weeks.",
    },
    operationalEvidence: [
      "docs/forecast-accuracy-monitoring.md",
      "pnpm test:api:integration",
    ],
    signOffs: makeSignOffs("Forecast demand signals"),
  },
] as const;

export function findDataContract(
  contractId: string,
): DataContractDefinition | undefined {
  return SMART_ERP_DATA_CONTRACTS.find(
    (contract) => contract.contractId === contractId,
  );
}
