import { test, expect } from "@playwright/test";

test("native Windows MVP shell loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Smart ERP Next")).toBeVisible();
  await expect(page.getByRole("button", { name: "POS" })).toBeVisible();
  await expect(page.getByText("Native Windows MVP - Tauri")).toBeVisible();
});
