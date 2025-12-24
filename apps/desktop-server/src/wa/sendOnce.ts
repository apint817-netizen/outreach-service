import { chromium } from "playwright";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

type Args = { to: string; text: string };

function parseArgs(argv: string[]): Args {
  const out: any = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--to") out.to = argv[++i];
    else if (a === "--text") out.text = argv[++i];
  }
  if (!out.to || !out.text) {
    console.error('Usage: pnpm tsx src/wa/sendOnce.ts -- --to "+7..." --text "..."');
    process.exit(2);
  }
  return out as Args;
}

function digits(s: string) {
  return s.replace(/[^\d]/g, "");
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

async function saveDebug(page: any, label: string, extraTxt?: string) {
  const dir = path.resolve(process.cwd(), "data", "wa-debug");
  ensureDir(dir);

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const png = path.join(dir, `${label}-${ts}.png`);
  const html = path.join(dir, `${label}-${ts}.html`);
  const txt = path.join(dir, `${label}-${ts}.txt`);

  await page.screenshot({ path: png, fullPage: true }).catch(() => {});
  const content = await page.content().catch(() => "");
  fs.writeFileSync(html, content, "utf8");

  const lines: string[] = [];
  lines.push(`URL: ${page.url()}`);
  if (extraTxt) lines.push("", extraTxt);
  fs.writeFileSync(txt, lines.join("\n"), "utf8");

  console.error("DEBUG_SAVED:");
  console.error("  screenshot:", png);
  console.error("  html:", html);
  console.error("  txt:", txt);
}

async function waitForLoaded(page: any) {
  const start = Date.now();
  const timeoutMs = 120000;
  while (Date.now() - start < timeoutMs) {
    const pane = await page.locator("#pane-side").first().isVisible().catch(() => false);
    const anyBox = await page.locator('[role="textbox"],[contenteditable="true"]').first().isVisible().catch(() => false);
    const canvas = await page.locator("canvas").first().isVisible().catch(() => false);
    if (pane || anyBox || canvas) return;
    await page.waitForTimeout(500);
  }
  throw new Error("WA_NOT_LOADED within 120s");
}

async function bestEffortReload(page: any) {
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    return "reload_ok";
  } catch (e: any) {
    return "reload_timeout";
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const dbPath = process.env.DB_PATH;
  if (!dbPath) throw new Error("DB_PATH missing");

  const db = new Database(dbPath);
  const sender = db.prepare("SELECT * FROM senders WHERE id='default'").get() as any;
  if (!sender?.sessionPath) throw new Error("sender.sessionPath missing (run wa:bootstrap)");
  const profileDir = String(sender.sessionPath);

  const toDigits = digits(args.to);
  const textEnc = encodeURIComponent(args.text);
  const sendUrl = `https://web.whatsapp.com/send?phone=${toDigits}&text=${textEnc}`;

  console.log("ProfileDir:", profileDir);
  console.log("To:", args.to, "->", toDigits);
  console.log("URL:", sendUrl);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    locale: "ru-RU",
    viewport: { width: 1280, height: 800 },
    bypassCSP: true,
    args: ["--no-default-browser-check", "--disable-dev-shm-usage", "--disable-application-cache"],
  });

  // ✅ hook BEFORE any WA script
  await context.addInitScript(`
(() => {
  window.__pw_req__ = null;
  window.__pw_capture_log__ = [];
  const log = (s) => { try { window.__pw_capture_log__.push(String(s)); } catch {} };

  function wrapChunkPush(chunkKey) {
    const chunk = window[chunkKey];
    if (!chunk || typeof chunk.push !== "function") return false;
    if (chunk.__pw_wrapped__) return true;
    chunk.__pw_wrapped__ = true;

    const origPush = chunk.push.bind(chunk);
    chunk.push = function(entry) {
      try {
        if (Array.isArray(entry) && typeof entry[2] === "function") {
          const origRuntime = entry[2];
          entry[2] = function() {
            try {
              const a0 = arguments[0];
              if (a0 && a0.m && !window.__pw_req__) {
                window.__pw_req__ = a0;
                log("captured_require_via_runtime");
              } else {
                log("runtime_called_args=" + Array.from(arguments).map(a => (a && a.m ? "reqLike" : typeof a)).join(","));
              }
            } catch (e) {
              log("runtime_wrap_error=" + (e && e.message ? e.message : String(e)));
            }
            return origRuntime.apply(this, arguments);
          };
        } else if (Array.isArray(entry)) {
          log("push_no_runtime_type=" + typeof entry[2]);
        } else {
          log("push_non_array");
        }
      } catch (e) {
        log("push_wrap_error=" + (e && e.message ? e.message : String(e)));
      }
      return origPush(entry);
    };

    log("wrapped_push_for=" + chunkKey);
    return true;
  }

  const keys = ["webpackChunkwhatsapp_web_client", "webpackChunkwhatsapp_web", "webpackChunkbuild"];
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    for (const k of keys) { try { wrapChunkPush(k); } catch {} }
    if (tries > 600) { clearInterval(t); log("poll_timeout"); }
  }, 50);
})();
`);

  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);

  // mild no-cache, but DON'T break everything
  await page.route("**/*", async (route) => {
    const req = route.request();
    const headers = { ...req.headers(), "Cache-Control": "no-cache" };
    await route.continue({ headers });
  });

  await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitForLoaded(page);

  const r1 = await bestEffortReload(page);
  console.log("Reload1:", r1);

  // Trigger more WA lazy loads by opening send URL a few times
  for (let i = 1; i <= 3; i++) {
    await page.goto(sendUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(3000);
    console.log("Opened sendUrl attempt:", i);
  }

  await page.waitForTimeout(5000);

  const probe = await page.evaluate(() => {
    const req: any = (window as any).__pw_req__;
    const logs: any = (window as any).__pw_capture_log__ || [];
    const out: string[] = [];
    out.push("captured=" + !!req);
    out.push("log=" + logs.join(" | "));
    if (req && req.m) out.push("moduleCount=" + Object.keys(req.m).length);
    return out.join("\\n");
  });

  console.log("WA_REQ_CAPTURE:\n" + probe);
  await saveDebug(page, "req-capture-v3", probe);

  console.error("STOP: capture collected. Browser will stay open. Close the window manually.");
  await page.waitForEvent("close").catch(() => {});
  db.close();
}

main().catch((e) => {
  console.error("RUN_FAILED:", e?.message ?? e);
  process.exit(2);
});
