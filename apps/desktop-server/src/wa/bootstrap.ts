import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { chromium } from "playwright";

function mustEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function resolveProfilesRoot(dbPath: string): string {
  const env = process.env.SENDER_PROFILES_DIR?.trim();
  if (env) return env;
  return path.resolve(path.dirname(dbPath), "sender-profiles");
}

async function main() {
  const dbPath = mustEnv("DB_PATH");
  const senderId = (process.env.SENDER_ID?.trim() || "default");

  const db = new Database(dbPath);

  const sender = db.prepare(`SELECT id, channel, state, sessionPath FROM senders WHERE id = ?`).get(senderId) as any;
  if (!sender) {
    throw new Error(`Sender '${senderId}' not found in DB. Start server (to run migrations) and ensure /senders shows default.`);
  }

  const profilesRoot = resolveProfilesRoot(dbPath);
  const profileDir = path.resolve(profilesRoot, "whatsapp_web", senderId);
  fs.mkdirSync(profileDir, { recursive: true });

  db.prepare(`
    UPDATE senders
    SET sessionPath = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(profileDir, senderId);

  console.log("DB:", dbPath);
  console.log("SenderId:", senderId);
  console.log("ProfilesRoot:", profilesRoot);
  console.log("ProfileDir:", profileDir);
  console.log("Open WhatsApp Web and complete login if needed...");

  const context = await chromium.launchPersistentContext(profileDir, { headless: false });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded" });

  // Decide state quickly, then wait for login completion up to 3 minutes.
  await page.waitForTimeout(1500);

  const hasQr =
    (await page.locator("canvas").count()) > 0 ||
    (await page.locator("div[role='img'][aria-label*='QR']").count()) > 0;

  db.prepare(`
    UPDATE senders
    SET state = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(hasQr ? "needs_login" : "connected", senderId);

  console.log("Initial sender state:", hasQr ? "needs_login" : "connected");

  // Wait until we see the left search box (means logged in) OR timeout.
  const searchSel = 'div[role="textbox"][data-tab="3"]';
  const start = Date.now();
  const timeoutMs = 180000;

  while (Date.now() - start < timeoutMs) {
    const loggedIn = await page.locator(searchSel).first().isVisible().catch(() => false);
    const qrStillThere = await page.locator("canvas").first().isVisible().catch(() => false);

    if (loggedIn) {
      db.prepare(`
        UPDATE senders
        SET state = 'connected', updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id = ?
      `).run(senderId);

      console.log("Login detected. Sender state updated to: connected");
      break;
    }

    if (qrStillThere) {
      // still needs login; keep waiting
    }

    await page.waitForTimeout(1000);
  }

  console.log("Bootstrap finished. Closing browser...");
  await context.close();
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
