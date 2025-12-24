import Fastify from "fastify";
import fetch from "node-fetch";
import "dotenv/config";

const app = Fastify({ logger: true });

const TOKEN = process.env.WA_CLOUD_TOKEN;
const PHONE_ID = process.env.WA_CLOUD_PHONE_NUMBER_ID;
const VERSION = process.env.WA_CLOUD_GRAPH_VERSION || "v21.0";

if (!TOKEN || !PHONE_ID) {
  console.error("Missing WA_CLOUD_TOKEN or WA_CLOUD_PHONE_NUMBER_ID");
  process.exit(1);
}

app.get("/health", async () => ({ ok: true }));

app.post("/send-text", async (req, reply) => {
  const { to, text } = req.body || {};
  if (!to || !text) {
    return reply.code(400).send({ error: "to and text required" });
  }

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });

  const body = await res.text();

  if (!res.ok) {
    return reply.code(502).send({
      error: "cloud_send_failed",
      status: res.status,
      body
    });
  }

  return { ok: true, body: JSON.parse(body) };
});

app.listen({ port: 3100, host: "0.0.0.0" })
  .then(() => console.log("WA-Gateway listening on :3100"));
