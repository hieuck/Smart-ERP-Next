import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from "@nestjs/common";
import { validateDataContract } from "../../../../packages/shared/src/data-contracts";
import {
  SMART_ERP_DATA_CONTRACTS,
  findDataContract,
} from "../../../../packages/shared/src/data-contract-registry";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("analytics/data-contracts")
@UseGuards(JwtAuthGuard)
export class DataContractsController {
  @Get()
  listContracts() {
    return SMART_ERP_DATA_CONTRACTS.map((contract) => ({
      contractId: contract.contractId,
      businessOwner: contract.businessOwner,
      consumers: contract.consumers,
      owner: contract.owner,
      piiClassification: contract.piiClassification,
      refreshCadence: contract.refreshCadence,
      sourceSystem: contract.sourceSystem,
      valid: validateDataContract(contract).valid,
    }));
  }

  @Get(":contractId")
  getContract(@Param("contractId") contractId: string) {
    const contract = findDataContract(contractId);

    if (!contract) {
      throw new NotFoundException(`Data contract ${contractId} was not found.`);
    }

    return {
      ...contract,
      validation: validateDataContract(contract),
    };
  }
}
