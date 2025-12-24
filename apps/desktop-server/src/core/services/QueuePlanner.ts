import { randomUUID } from "node:crypto";
import type { QueueRepo } from "../repositories/QueueRepo.js";
import type { ContactsRepo } from "../repositories/ContactsRepo.js";
import type { RunsRepo } from "../repositories/RunsRepo.js";

export class QueuePlanner {
  constructor(
    private deps: {
      queue: QueueRepo;
      contacts: ContactsRepo;
      runs: RunsRepo;
      campaigns: any; // { db }
    }
  ) {}

  /**
   * Планирует queue_items для run
   * Возвращает { planned, skipped }
   * NOTE: events пишутся ВНЕ planner (в route /runs/:id/start)
   */
  planForRun(runId: string): { planned: number; skipped: number } {
    const run = this.deps.runs.getById(runId);
    if (!run) throw new Error("RUN_NOT_FOUND");

    const campaign = (this.deps.campaigns.db.prepare(
      `SELECT stepsJson FROM campaigns WHERE id = ?`
    ) as any).get(run.campaignId);

    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    let steps: any[] = [];
    try {
      steps = JSON.parse(campaign.stepsJson ?? "[]");
    } catch {
      steps = [];
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return { planned: 0, skipped: 0 };
    }

    const contacts = this.deps.contacts
      .list()
      .filter(c => c.channel === "whatsapp" && c.status === "active");

    let planned = 0;
    let skipped = 0;

    const dueAt = Date.now();

    for (const contact of contacts) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step?.text) {
          skipped++;
          continue;
        }

        const payload = {
          text: step.text,
          contact: {
            id: contact.id,
            displayName: contact.displayName,
            phoneE164: contact.phoneE164,
          },
        };

        this.deps.queue.enqueue({
          id: randomUUID(),
          runId: run.id,
          campaignId: run.campaignId,
          senderId: run.senderId,
          contactId: contact.id,
          stepId: `step_${i}`,
          dueAt,
          payloadJson: JSON.stringify(payload),
        });

        planned++;
      }
    }

    return { planned, skipped };
  }
}
