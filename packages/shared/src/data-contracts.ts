export type DataContractPiiClass = "Public" | "Internal" | "Sensitive";

export interface DataContractField {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
  validationRule: string;
  piiClass: DataContractPiiClass;
}

export interface DataContractQualityChecks {
  freshnessSla: string;
  completeness: string;
  accuracy: string;
  uniqueness: string;
  drift: string;
}

export interface DataContractSignOff {
  role: string;
  evidence: string;
}

export interface DataContractDefinition {
  contractId: string;
  owner: string;
  businessOwner: string;
  sourceSystem: string;
  consumers: string[];
  refreshCadence: string;
  retention: string;
  piiClassification: DataContractPiiClass;
  changePolicy: string;
  fields: DataContractField[];
  qualityChecks: DataContractQualityChecks;
  operationalEvidence: string[];
  signOffs: DataContractSignOff[];
}

export interface DataContractValidationResult {
  valid: boolean;
  errors: string[];
}

type DataContractInput = Partial<DataContractDefinition> | null | undefined;
type QualityCheckKey = keyof DataContractQualityChecks;

const CONTRACT_ID_PATTERN = /^DATA-[a-z0-9-]+-[a-z0-9-]+-v\d+$/;
const PII_CLASSES: readonly DataContractPiiClass[] = [
  "Public",
  "Internal",
  "Sensitive",
];
const REQUIRED_SIGN_OFF_ROLES = [
  "Product Manager",
  "Business Analyst / Domain SME",
  "Data Engineer / Analytics",
  "QA Engineer / SDET",
  "Security Engineer",
] as const;
const QUALITY_CHECK_KEYS: readonly QualityCheckKey[] = [
  "freshnessSla",
  "completeness",
  "accuracy",
  "uniqueness",
  "drift",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isBlank(value: unknown): boolean {
  return asString(value).trim().length === 0;
}

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function hasBlankItem(values: unknown[]): boolean {
  return values.some((value) => isBlank(value));
}

function validateRequiredString(
  errors: string[],
  fieldName: string,
  value: unknown,
): void {
  if (isBlank(value)) errors.push(`${fieldName} is required.`);
}

function validatePiiClass(
  errors: string[],
  fieldName: string,
  value: unknown,
): void {
  if (!PII_CLASSES.includes(value as DataContractPiiClass)) {
    errors.push(`${fieldName} must be Public, Internal, or Sensitive.`);
  }
}

export function validateDataContract(
  contract: DataContractInput,
): DataContractValidationResult {
  const errors: string[] = [];

  if (!contract) {
    return { valid: false, errors: ["contract is required."] };
  }

  validateRequiredString(errors, "contractId", contract.contractId);
  if (!CONTRACT_ID_PATTERN.test(asString(contract.contractId))) {
    errors.push("contractId must follow DATA-<module>-<dataset>-v<major>.");
  }

  validateRequiredString(errors, "owner", contract.owner);
  validateRequiredString(errors, "businessOwner", contract.businessOwner);
  validateRequiredString(errors, "sourceSystem", contract.sourceSystem);
  validateRequiredString(errors, "refreshCadence", contract.refreshCadence);
  validateRequiredString(errors, "retention", contract.retention);
  validateRequiredString(errors, "changePolicy", contract.changePolicy);
  validatePiiClass(errors, "piiClassification", contract.piiClassification);

  const consumers = asArray(contract.consumers);
  if (consumers.length === 0 || hasBlankItem(consumers)) {
    errors.push("consumers must include at least one named consumer.");
  }

  const fields = asArray(contract.fields);
  if (fields.length === 0) {
    errors.push("fields must include at least one data field.");
  }

  for (const field of fields) {
    const fieldName = asString(field.name) || "<unnamed>";
    validateRequiredString(errors, `fields.${fieldName}.name`, field.name);
    validateRequiredString(errors, `fields.${fieldName}.type`, field.type);
    validateRequiredString(
      errors,
      `fields.${fieldName}.description`,
      field.description,
    );
    validateRequiredString(
      errors,
      `fields.${fieldName}.validationRule`,
      field.validationRule,
    );
    validatePiiClass(errors, `fields.${fieldName}.piiClass`, field.piiClass);
  }

  const qualityChecks: Partial<DataContractQualityChecks> =
    contract.qualityChecks ?? {};
  for (const key of QUALITY_CHECK_KEYS) {
    validateRequiredString(errors, `qualityChecks.${key}`, qualityChecks[key]);
  }

  const operationalEvidence = asArray(contract.operationalEvidence);
  if (operationalEvidence.length === 0 || hasBlankItem(operationalEvidence)) {
    errors.push(
      "operationalEvidence must include test, dashboard, or runbook evidence.",
    );
  }

  const signOffs = asArray(contract.signOffs);
  const signedRoles = new Set(signOffs.map((signOff) => signOff.role));
  for (const role of REQUIRED_SIGN_OFF_ROLES) {
    if (!signedRoles.has(role)) errors.push(`signOffs must include ${role}.`);
  }

  for (const signOff of signOffs) {
    validateRequiredString(
      errors,
      `signOffs.${signOff.role || "<unnamed>"}.evidence`,
      signOff.evidence,
    );
  }

  return { valid: errors.length === 0, errors };
}

export function createDataContractId(
  moduleName: string,
  datasetName: string,
  majorVersion = 1,
): string {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return `DATA-${normalize(moduleName)}-${normalize(datasetName)}-v${majorVersion}`;
}
