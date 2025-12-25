import Fastify from "fastify";
import { z } from "zod";

function parseBool(v: unknown, def: boolean) {
  if (v === undefined || v === null) return def;
  if (typeof v === "boolean") return v;

  const s = String(v).trim().toLowerCase().replace(/^"+|"+$/g, "");
  if (s === "") return def;
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return def;
}

// Читаем переменные напрямую, чтобы поддержать опечатки в именах
const GATEWAY_KEY =
  process.env.GATEWAY_API_KEY ??
  process.env.GATEWAY_API_KEY ?? // typo-safe (без WAY)
  "dev-key-change-me";

const META_TOKEN = process.env.META_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Остальное — через Zod (без дублей)
const EnvSchema = z.object({
  PORT: z.coerce.number().default(8787),
  META_API_VERSION: z.string().default("v20.0"),
  DRY_RUN: z.any().optional(),
});

const raw = EnvSchema.parse(process.env);

const env = {
  PORT: raw.PORT,
  META_API_VERSION: raw.META_API_VERSION,
  DRY_RUN: parseBool(raw.DRY_RUN, true),

  GATEWAY_API_KEY: GATEWAY_KEY,
  META_TOKEN,
  META_PHONE_NUMBER_ID,
};

const app = Fastify({ logger: true });

app.get("/", async () => ({ ok: true, service: "wa-gateway", ts: Date.now(), dryRun: env.DRY_RUN }));

app.get("/health", async () => {
  return { ok: true, service: "wa-gateway", ts: Date.now(), dryRun: env.DRY_RUN };
});

function assertMetaConfigured() {
  const missing = [
    !env.META_TOKEN ? "META_TOKEN" : null,
    !env.META_PHONE_NUMBER_ID ? "META_PHONE_NUMBER_ID" : null,
  ].filter(Boolean);

  if (missing.length) {
    const err = new Error(`META_NOT_CONFIGURED: missing ${missing.join(", ")}`);
    // @ts-ignore
    err.statusCode = 400;
    throw err;
  }
}

const SendTextSchema = z.object({
  to: z.string().min(5),
  text: z.string().min(1),
});

app.post("/send-text", async (req, reply) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== env.GATEWAY_API_KEY) {
    return reply.code(401).send({ ok: false, error: "UNAUTHORIZED" });
  }

  const body = SendTextSchema.parse(req.body);
  return await sendViaMeta(body.to, body.text, req.log);
});

async function sendViaMeta(to: string, text: string, log: any) {
  if (env.DRY_RUN) {
    log.info({ to, textLen: text.length }, "DRY_RUN_META_SEND");
    return { ok: true, accepted: true, dryRun: true };
  }

  assertMetaConfigured();

  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.META_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    log.error({ status: r.status, data }, "META_SEND_FAILED");
    return { ok: false, error: "META_SEND_FAILED", status: r.status, data };
  }

  log.info({ status: r.status, data }, "META_SEND_OK");
  return { ok: true, accepted: true, meta: data };
}

app.setErrorHandler((err, _req, reply) => {
  const status = (err as any).statusCode ?? 500;
  reply.code(status).send({ ok: false, error: "GATEWAY_ERROR", message: err.message });
});

app.listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`wa-gateway listening on http://0.0.0.0:${env.PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });