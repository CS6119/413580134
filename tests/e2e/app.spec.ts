import { expect, test } from "@playwright/test";

test("shows the login page and switches to registration", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("第 04 組｜課堂工作台");
  await expect(page.getByRole("heading", { name: "歡迎回來" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用 Google 帳號登入" })).toBeVisible();

  await page.getByRole("button", { name: "註冊帳號" }).click();

  await expect(page.getByRole("heading", { name: "開始你的第一步" })).toBeVisible();
  await expect(page.getByLabel("顯示名稱")).toBeVisible();
  await expect(page.getByRole("button", { name: "建立帳號" })).toBeVisible();
});
