import Fastify from "fastify";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8787),
  GATEWAY_API_KEY: z.string().min(10).default("dev-key-change-me"),

  META_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_API_VERSION: z.string().default("v20.0"),

  DRY_RUN: z.coerce.boolean().default(true),
});

const env = EnvSchema.parse(process.env);

const app = Fastify({ logger: true });

// Render / healthchecks sometimes probe "/"
app.get("/", async () => ({ ok: true, service: "wa-gateway", ts: Date.now() }));

app.get("/health", async () => {
  return { ok: true, service: "wa-gateway", ts: Date.now(), dryRun: env.DRY_RUN };
});

function assertMetaConfigured() {
  if (!env.META_TOKEN || !env.META_PHONE_NUMBER_ID) {
    const missing = [
      !env.META_TOKEN ? "META_TOKEN" : null,
      !env.META_PHONE_NUMBER_ID ? "META_PHONE_NUMBER_ID" : null,
    ].filter(Boolean);
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
  const res = await sendViaMeta(body.to, body.text, req.log);
  return res;
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
      "Authorization": `Bearer ${env.META_TOKEN}`,
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
  reply.code(status).send({
    ok: false,
    error: "GATEWAY_ERROR",
    message: err.message,
  });
});

// IMPORTANT: Render needs 0.0.0.0, not 127.0.0.1
app.listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`wa-gateway listening on http://0.0.0.0:${env.PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });