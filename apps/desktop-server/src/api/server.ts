import Fastify from "fastify";

import { registerHealthRoutes } from "./routes/health.js";
import { registerContactsRoutes } from "./routes/contacts.js";
import { registerQueueRoutes } from "./routes/queue.js";
import { registerRunsRoutes } from "./routes/runs.js";
import { registerCampaignsRoutes } from "./routes/campaigns.js";
import { registerSegmentsRoutes } from "./routes/segments.js";
import { registerSenderRoutes } from "./routes/senders.js";

import { SenderRepo } from "../infra/db/SenderRepo.js";

export function buildApiServer(opts: { db: any; deps?: any }) {
  const app = Fastify({ logger: false });

  app.decorate("db", opts.db);

  // Ensure default sender exists (id='default')
  try {
    new SenderRepo(opts.db).upsertDefaultSender();
  } catch {
    // don't block server start if senders table isn't present for some reason
  }

  registerHealthRoutes(app);
  registerContactsRoutes(app);
  registerSegmentsRoutes(app);
  registerCampaignsRoutes(app);
  registerRunsRoutes(app, opts.deps);
  registerQueueRoutes(app);
  registerSenderRoutes(app);

  return app;
}
