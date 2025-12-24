/**
 * WhatsApp Cloud API send-once (text)
 *
 * Required env:
 *  - WA_CLOUD_TOKEN
 *  - WA_CLOUD_PHONE_NUMBER_ID
 * Optional:
 *  - WA_CLOUD_GRAPH_VERSION (default: v21.0)
 *
 * Run:
 *  pnpm tsx src/wa/sendOnceCloud.ts -- --to "+7901..." --text "Hello"
 */

type Args = { to: string; text: string };

function parseArgs(argv: string[]): Args {
  const out: any = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--to") out.to = argv[++i];
    else if (a === "--text") out.text = argv[++i];
  }
  if (!out.to || !out.text) {
    console.error('Usage: pnpm tsx src/wa/sendOnceCloud.ts -- --to "+7901..." --text "..."');
    process.exit(2);
  }
  return out as Args;
}

function digits(s: string) {
  return s.replace(/[^\d]/g, "");
}

async function main() {
  const args = parseArgs(process.argv);

  const token = process.env.WA_CLOUD_TOKEN?.trim();
  const phoneNumberId = process.env.WA_CLOUD_PHONE_NUMBER_ID?.trim();
  const verRaw = process.env.WA_CLOUD_GRAPH_VERSION?.trim() || "v21.0";
  const ver = verRaw.startsWith("v") ? verRaw : `v${verRaw}`;

  if (!token || token === "PASTE_TOKEN_HERE") throw new Error("WA_CLOUD_TOKEN missing/placeholder");
  if (!phoneNumberId || phoneNumberId === "PASTE_PHONE_NUMBER_ID_HERE") throw new Error("WA_CLOUD_PHONE_NUMBER_ID missing/placeholder");

  const to = digits(args.to);
  const url = `https://graph.facebook.com/${ver}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: args.text },
  };

  console.log("Cloud URL:", url);
  console.log("To:", args.to, "->", to);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();

    if (!res.ok) {
      console.error("SEND_FAILED_HTTP:", res.status, res.statusText);
      console.error(bodyText);
      process.exit(2);
    }

    console.log("SEND_OK:");
    console.log(bodyText);
  } catch (e: any) {
    console.error("SEND_FAILED_FETCH:", e?.message ?? e);
    if (e?.cause) console.error("CAUSE:", e.cause);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("SEND_FAILED_FATAL:", e?.message ?? e);
  process.exit(1);
});
