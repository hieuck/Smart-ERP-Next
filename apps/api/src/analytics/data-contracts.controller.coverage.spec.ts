import { NotFoundException } from "@nestjs/common";
import { DataContractsController } from "./data-contracts.controller";

describe("DataContractsController", () => {
  let controller: DataContractsController;

  beforeEach(() => {
    controller = new DataContractsController();
  });

  it("lists baseline contract summaries with validation status", () => {
    const result = controller.listContracts();

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      contractId: "DATA-sales-order-facts-v1",
      valid: true,
    });
    expect(result.every((contract) => contract.valid)).toBe(true);
  });

  it("returns a full contract with validation details", () => {
    const result = controller.getContract("DATA-forecast-demand-signals-v1");

    expect(result.contractId).toBe("DATA-forecast-demand-signals-v1");
    expect(result.validation).toEqual({ valid: true, errors: [] });
  });

  it("throws NotFoundException for unknown contract ids", () => {
    expect(() => controller.getContract("DATA-missing-dataset-v1")).toThrow(
      NotFoundException,
    );
  });
});
