import {
  DataContractDefinition,
  createDataContractId,
  validateDataContract,
} from "../src/data-contracts";
import {
  SMART_ERP_DATA_CONTRACTS,
  findDataContract,
} from "../src/data-contract-registry";

const validContract: DataContractDefinition = {
  contractId: "DATA-sales-orders-v1",
  owner: "Data Engineering",
  businessOwner: "Sales PM",
  sourceSystem: "orders service",
  consumers: ["Sales dashboard", "Forecast job"],
  refreshCadence: "hourly",
  retention: "7 years",
  piiClassification: "Internal",
  changePolicy: "30-day deprecation window",
  fields: [
    {
      name: "order_id",
      type: "string",
      nullable: false,
      description: "Stable order identifier.",
      validationRule: "Non-empty and unique per tenant.",
      piiClass: "Public",
    },
  ],
  qualityChecks: {
    freshnessSla: "Orders appear within 15 minutes.",
    completeness: "Daily row count reconciles with orders table.",
    accuracy: "Revenue equals sum of accepted order lines.",
    uniqueness: "order_id is unique per tenant.",
    drift: "Alert when category mix changes by more than 25% week over week.",
  },
  operationalEvidence: [
    "pnpm test:api:integration",
    "Sales dashboard freshness panel",
  ],
  signOffs: [
    { role: "Product Manager", evidence: "KPI reviewed." },
    {
      role: "Business Analyst / Domain SME",
      evidence: "Revenue formula approved.",
    },
    {
      role: "Data Engineer / Analytics",
      evidence: "Schema and lineage reviewed.",
    },
    { role: "QA Engineer / SDET", evidence: "Integration tests mapped." },
    { role: "Security Engineer", evidence: "PII classification approved." },
  ],
};

describe("data contract helpers", () => {
  it("creates normalized contract ids", () => {
    expect(createDataContractId("Sales Ops", "Order Facts", 2)).toBe(
      "DATA-sales-ops-order-facts-v2",
    );
  });

  it("accepts a complete data contract", () => {
    expect(validateDataContract(validContract)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("reports missing evidence and sign-offs", () => {
    const result = validateDataContract({
      ...validContract,
      contractId: "sales-orders",
      operationalEvidence: [],
      signOffs: validContract.signOffs.filter(
        (signOff) => signOff.role !== "Security Engineer",
      ),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "contractId must follow DATA-<module>-<dataset>-v<major>.",
    );
    expect(result.errors).toContain(
      "operationalEvidence must include test, dashboard, or runbook evidence.",
    );
    expect(result.errors).toContain("signOffs must include Security Engineer.");
  });
  it("ships valid baseline contracts for core analytics datasets", () => {
    expect(SMART_ERP_DATA_CONTRACTS).toHaveLength(3);
    expect(
      SMART_ERP_DATA_CONTRACTS.map((contract) =>
        validateDataContract(contract),
      ),
    ).toEqual(
      SMART_ERP_DATA_CONTRACTS.map(() => ({ valid: true, errors: [] })),
    );
  });

  it("finds baseline contracts by id", () => {
    expect(
      findDataContract("DATA-forecast-demand-signals-v1")?.sourceSystem,
    ).toBe("orders service + forecast cache");
    expect(findDataContract("DATA-missing-dataset-v1")).toBeUndefined();
  });

  it("returns validation errors instead of throwing for partial runtime input", () => {
    const result = validateDataContract({
      contractId: "DATA-sales-orders-v1",
      owner: "Data Engineering",
      piiClassification: "Restricted" as never,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("businessOwner is required.");
    expect(result.errors).toContain(
      "piiClassification must be Public, Internal, or Sensitive.",
    );
    expect(result.errors).toContain("qualityChecks.freshnessSla is required.");
    expect(result.errors).toContain(
      "operationalEvidence must include test, dashboard, or runbook evidence.",
    );
  });
});
