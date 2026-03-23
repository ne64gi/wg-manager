import { expect, test } from "@playwright/test";

const origin = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3900/wg-studio/").origin;
const username = process.env.E2E_USERNAME ?? "playwright-admin";
const password = process.env.E2E_PASSWORD ?? "playwright-pass-123!";
const runId = Date.now().toString();
const subnetOctet = (Number(runId.slice(-3)) % 200) + 20;
const networkCidr = `10.${subnetOctet}.0.0/24`;
const allowedIps = `10.${subnetOctet}.0.0/24`;
const names = {
  group: `smoke-group-${runId}`,
  user: `smoke-user-${runId}`,
  peer: `smoke-peer-${runId}`,
};

async function ensureAuthenticated(page: Parameters<typeof test>[0]["page"]) {
  let setupStatusResponse;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      setupStatusResponse = await page.request.get(`${origin}/api/auth/setup-status`);
      if (setupStatusResponse.ok()) {
        break;
      }
    } catch {
      // The web container can still be settling on the internal network for a moment.
    }
    await page.waitForTimeout(500);
  }
  expect(setupStatusResponse?.ok()).toBeTruthy();
  const setupStatus = (await setupStatusResponse.json()) as { has_login_users: boolean };

  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect
    .poll(
      async () => {
        const authVisible = await page.getByTestId("login-submit").isVisible().catch(() => false);
        const dashboardVisible = await page
          .getByTestId("dashboard-sync-state")
          .isVisible()
          .catch(() => false);

        if (dashboardVisible) {
          return "dashboard";
        }
        if (authVisible) {
          return "auth";
        }
        return "loading";
      },
      { timeout: 10000 },
    )
    .not.toBe("loading");

  if (await page.getByTestId("dashboard-sync-state").isVisible().catch(() => false)) {
    return;
  }

  if (!setupStatus.has_login_users) {
    await page.getByTestId("login-username").fill(username);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-confirm-password").fill(password);
    await page.getByTestId("login-submit").click();
  } else {
    await page.getByTestId("login-username").fill(username);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();
  }

  await expect(page).toHaveURL(/\/wg-studio\/?$/);
  await expect(page.getByTestId("dashboard-sync-state")).toBeVisible();
}

test.describe.serial("v1 smoke", () => {
  test("login display settings carry into the authenticated app shell", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByTestId("login-display-settings").click();
    await page.getByTestId("login-theme-toggle").click();
    await page.getByTestId("login-language-select").selectOption("ja");

    await ensureAuthenticated(page);

    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "light");
  });

  test("login or first-user setup reaches the dashboard", async ({ page }) => {
    await ensureAuthenticated(page);
    await expect(page.getByTestId("dashboard-sync-state")).toBeVisible();
  });

  test("group, user, and peer can be created from the GUI", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.getByTestId("nav-groups").click();
    await page.getByTestId("groups-add-button").click();
    await page.getByTestId("groups-create-name").fill(names.group);
    await page.getByTestId("groups-create-network-cidr").fill(networkCidr);
    await page.getByTestId("groups-create-allowed-ips").fill(allowedIps);
    await page.getByTestId("groups-create-submit").click();
    await page.getByTestId("groups-search").fill(names.group);
    await expect(page.getByText(names.group).first()).toBeVisible({ timeout: 10000 });
    await page.getByTestId("groups-search").fill("");

    await page.getByTestId("nav-users").click();
    await page.getByTestId("users-add-button").click();
    await page.getByTestId("users-create-group").selectOption({ label: names.group });
    await page.getByTestId("users-create-name").fill(names.user);
    await page.getByTestId("users-create-submit").click();
    await page.getByTestId("users-search").fill(names.user);
    await expect(page.getByText(names.user).first()).toBeVisible({ timeout: 10000 });
    await page.getByTestId("users-search").fill("");

    await page.getByTestId("nav-peers").click();
    await page.getByTestId("peers-add-button").click();
    await page.getByTestId("peers-create-user").selectOption({ label: names.user });
    await page.getByTestId("peers-create-name").fill(names.peer);
    await page.getByTestId("peers-create-submit").click();
    await page.getByTestId("peers-search").fill(names.peer);
    await expect(page.getByText(names.peer).first()).toBeVisible({ timeout: 10000 });
  });

  test("reveal actions are visible and logs controls load", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.getByTestId("nav-peers").click();
    await page.getByTestId("peers-search").fill(names.peer);
    await page.getByTestId("peer-reveal-button").first().click();
    await expect(page.getByTestId("reveal-modal")).toBeVisible();
    await expect(page.getByTestId("reveal-download-config")).toBeVisible();
    await expect(page.getByTestId("reveal-download-qr")).toBeVisible();
    await page.getByTestId("reveal-close").click();

    await page.getByTestId("peers-apply-button").click();
    await expect(page.getByText(/Config applied\.|設定を適用しました。/).first()).toBeVisible();

    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("dashboard-sync-state")).toBeVisible();

    await page.getByTestId("nav-logs").click();
    await expect(page.getByTestId("logs-level-filter")).toBeVisible();
    await expect(page.getByTestId("logs-category-filter")).toBeVisible();
    await expect(page.getByTestId("logs-search")).toBeVisible();
    await expect(page.getByTestId("logs-pagination")).toBeVisible();
  });

  test("dashboard group traffic can expand and collapse as a grouped view", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.getByTestId("nav-dashboard").click();
    const accordion = page
      .locator(`[data-testid^="dashboard-group-accordion-"]`, { hasText: names.group })
      .first();

    await page.getByTestId("dashboard-expand-groups").click();
    await expect(accordion).toHaveAttribute("open", "");
    await accordion.locator("summary").click();
    await expect(accordion).not.toHaveAttribute("open", "");
    await page.getByTestId("dashboard-expand-groups").click();
    await expect(accordion.getByText(names.user).first()).toBeVisible();
    await page.getByTestId("dashboard-collapse-groups").click();
    await expect(accordion).not.toHaveAttribute("open", "");
  });

  test("desktop sidebar can collapse into icon-only navigation", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.setViewportSize({ width: 1440, height: 960 });
    await page.getByTestId("sidebar-toggle").click();
    await expect(page.getByTestId("app-shell")).toHaveClass(/app-shell-sidebar-collapsed/);
  });

  test("settings shows the runtime adapter in build information", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-runtime-adapter")).toHaveValue("docker_container");
  });
});
