jest.mock("../src/ui/Badge", () => ({ Badge: "Badge" }));
jest.mock("../src/ui/Button", () => ({ Button: "Button" }));
jest.mock("../src/ui/Select", () => ({ Select: "Select" }));
jest.mock("../src/ui/Table", () => ({ Table: "Table" }));
jest.mock("../src/ui/DatePicker", () => ({ DatePicker: "DatePicker" }));
jest.mock("../src/ui/Input", () => ({ Input: "Input" }));
jest.mock("../src/ui/PageHeader", () => ({ PageHeader: "PageHeader" }));
jest.mock("../src/ui/DataTable", () => ({ DataTable: "DataTable" }));
jest.mock("../src/ui/StatCard", () => ({ StatCard: "StatCard" }));
jest.mock("../src/ui/Card", () => ({ Card: "Card" }));
jest.mock("../src/ui/Spinner", () => ({ Spinner: "Spinner" }));
jest.mock("../src/ui/Chart", () => ({ Chart: "Chart" }));
jest.mock("../src/ui/Switch", () => ({ Switch: "Switch" }));
jest.mock("../src/ui/Toast", () => ({ Toast: "Toast" }));
jest.mock("../src/ui/ConfirmDialog", () => ({
  ConfirmDialog: "ConfirmDialog",
}));

import * as shared from "../src";

describe("shared package index exports", () => {
  it("re-exports shared catalogs, localization, utilities, and UI helpers", () => {
    expect(shared).toHaveProperty("ERP_MODULES");
    expect(shared).toHaveProperty("SUPPORTED_LOCALES");
    expect(shared).toHaveProperty("formatVND");
    expect(shared).toHaveProperty("validateDataContract");
    expect(shared).toHaveProperty("SMART_ERP_DATA_CONTRACTS");
    expect(shared).toHaveProperty("useToast");
  });
});
