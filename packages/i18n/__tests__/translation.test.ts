import { defaultNS, fallbackLng, i18n, initI18n, resources, t } from "../src";

type FlatTranslation = {
  path: string;
  value: string;
};

const flattenStringValues = (
  value: unknown,
  prefix = "",
): FlatTranslation[] => {
  if (typeof value === "string") {
    return [{ path: prefix, value }];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nestedValue]) =>
      flattenStringValues(nestedValue, prefix ? `${prefix}.${key}` : key),
  );
};

describe("i18n resources and helpers", () => {
  afterEach(() => {
    if (i18n.isInitialized && i18n.language !== fallbackLng) {
      i18n.changeLanguage(fallbackLng);
    }
  });

  it("ships Vietnamese and English common resources", () => {
    expect(defaultNS).toBe("common");
    expect(fallbackLng).toBe("vi");
    expect(resources.vi.common.appName).toBe("Smart ERP Next");
    expect(resources.en.common.tagline).toBe(
      "Intelligent Business Management System",
    );
  });

  it("translates nested keys without initializing React i18next", () => {
    expect(t("actions.save", "vi")).toBe("Lưu");
    expect(t("actions.save", "en")).toBe("Save");
    expect(t("actions.search.placeholder", "en")).toBe(
      "Search products, orders, customers...",
    );
  });

  it("returns the key when a nested translation is missing or non-string", () => {
    expect(t("actions.not_real", "vi")).toBe("actions.not_real");
    expect(t("actions.search", "en")).toBe("actions.search");
  });

  it("keeps critical Vietnamese UI copy encoded as UTF-8", () => {
    expect(t("auth.login", "vi")).toBe("Đăng nhập");
    expect(t("auth.register", "vi")).toBe("Đăng ký");
    expect(t("actions.save", "vi")).toBe("Lưu");
    expect(t("products.category", "vi")).toBe("Danh mục");
    expect(t("products.images", "vi")).toBe("Hình ảnh");

    const corruptedStrings = flattenStringValues(resources.vi.common).filter(
      ({ value }) => value.includes("\uFFFD"),
    );

    expect(corruptedStrings).toEqual([]);
  });

  it("initializes i18next once and changes language on later calls", async () => {
    await initI18n("vi");
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe("vi");

    await initI18n("en");
    expect(i18n.language).toBe("en");
  });
});
