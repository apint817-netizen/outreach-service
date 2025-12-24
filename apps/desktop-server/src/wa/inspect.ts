import { chromium } from "playwright";
import Database from "better-sqlite3";

function resolveDbPath() {
  const env = process.env.DB_PATH?.trim();
  if (!env) throw new Error("DB_PATH is required");
  return env;
}

async function dump(page: any, label: string) {
  console.log("\n==============================");
  console.log("DUMP:", label, "time=", new Date().toISOString());
  console.log("==============================");

  // Candidates for inputs: contenteditable + role textbox + data-tab
  const candidates = [
    'div[contenteditable="true"]',
    '[role="textbox"]',
    'div[data-tab][contenteditable="true"]'
  ];

  const out: any[] = [];
  for (const sel of candidates) {
    const loc = page.locator(sel);
    const n = await loc.count();
    for (let i = 0; i < Math.min(n, 25); i++) {
      const el = loc.nth(i);
      const box = await el.boundingBox().catch(() => null);
      if (!box) continue;
      if (box.width < 20 || box.height < 10) continue;

      const attrs = {
        role: await el.getAttribute("role").catch(() => null),
        ariaLabel: await el.getAttribute("aria-label").catch(() => null),
        title: await el.getAttribute("title").catch(() => null),
        dataTab: await el.getAttribute("data-tab").catch(() => null),
        dataTestId: await el.getAttribute("data-testid").catch(() => null),
        id: await el.getAttribute("id").catch(() => null),
        class: await el.getAttribute("class").catch(() => null)
      };

      // innerText for editable often empty; still try
      const text = await el.innerText().catch(() => "");
      out.push({
        selector: sel,
        index: i,
        rect: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
        attrs,
        text: (text || "").slice(0, 80)
      });
    }
  }

  console.log("Visible textbox candidates (first 80):");
  console.log(JSON.stringify(out.slice(0, 80), null, 2));

  // Left panel counts (no evaluate)
  const leftSelectors = [
    "#pane-side",
    "#pane-side div[role='listitem']",
    "#pane-side [data-testid='cell-frame-container']",
    "#pane-side [role='grid']",
    "#pane-side [role='grid'] [role='row']",
    "[data-testid='chat-list']",
    "[data-testid='chat-list'] [role='row']"
  ];

  const counts: any[] = [];
  for (const s of leftSelectors) {
    counts.push({ selector: s, count: await page.locator(s).count().catch(() => 0) });
  }

  console.log("\nLeft panel candidate counts:");
  console.log(JSON.stringify(counts, null, 2));
}

async function main() {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  const sender = db.prepare("SELECT * FROM senders WHERE id='default'").get() as any;
  if (!sender) throw new Error("Sender 'default' not found");
  if (!sender.sessionPath) throw new Error("Sender sessionPath is null (run wa:bootstrap first)");

  const context = await chromium.launchPersistentContext(String(sender.sessionPath), {
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-default-browser-check",
      "--disable-dev-shm-usage"
    ]
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(2500);
  await dump(page, "initial");

  console.log("\nACTION: click into the LEFT search box (Поиск или новый чат), then wait 20s…");
  await page.waitForTimeout(20000);

  await dump(page, "after_manual_click");

  console.log("\nClose the browser window to exit.");
  await page.waitForEvent("close").catch(() => {});
  await context.close();
  db.close();
}

main().catch((e) => {
  console.error("INSPECT_FAILED:", e?.message ?? e);
  process.exit(1);
});
