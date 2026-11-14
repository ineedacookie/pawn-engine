import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createWorkshopServer } from "../server.mjs";

test("real Chromium verifies the starter, expression occlusion and action layering", { timeout: 300_000 }, async t => {
  const server = createWorkshopServer();
  let browser, page;
  const errors = [], results = {};
  const artifacts = new URL("../output/playwright/", import.meta.url);
  await mkdir(artifacts, { recursive: true });
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    // Headless: no desktop window is opened. Always close, including on failure.
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/example.html`);
    await page.waitForFunction(() => !document.querySelector("#react").disabled);
    await t.test("a consumer can move, react and switch held props", async () => {
      const pixels = await page.locator("canvas").evaluate(canvas => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v > 0));
      assert.ok(pixels, "The starter drew a pawn");
      await page.locator("canvas").click();
      try {
        await page.keyboard.down("ArrowRight");
        await page.waitForFunction(() => document.querySelector("#status").textContent.includes("Facing east"));
      } finally { await page.keyboard.up("ArrowRight"); }
      await page.getByRole("button", { name: "Hold cards", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.includes("hold-cards"));
      await page.getByRole("button", { name: "Heart reaction", exact: true }).click();
      await page.screenshot({ path: new URL("integration.png", artifacts).pathname });
    });
    for (const [name, module, run] of [
      ["expressions", "/expression-checks.js", "runExpressionChecks"],
      ["actions", "/character-checks.js", "runCharacterChecks"],
    ]) {
      await t.test(`${name}: real pixel checks across directions and proportions`, async () => {
        const result = await page.evaluate(async ({ module, run }) => (await import(module))[run](), { module, run });
        results[name] = result;
        assert.ok(result.checks > 0);
        assert.equal(result.failed, 0, JSON.stringify(result.failures));
        console.log(`${name}: ${result.checks} pixel checks passed across ${result.cases} cases`);
      });
    }
    assert.deepEqual(errors, [], "No browser runtime errors");
  } finally {
    await writeFile(new URL("browser-results.json", artifacts), JSON.stringify({ ...results, errors }, null, 2));
    try { if (page && !page.isClosed()) await page.screenshot({ path: new URL("browser-final.png", artifacts).pathname }); }
    finally {
      try { await browser?.close(); }
      finally { if (server.listening) await new Promise(resolve => server.close(resolve)); }
    }
  }
});
