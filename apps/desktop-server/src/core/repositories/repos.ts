import Database from "better-sqlite3";

import { SegmentsRepo } from "./SegmentsRepo";
import { CampaignsRepo } from "./CampaignsRepo";
import { RunsRepo } from "./RunsRepo";
import { RunEventsRepo } from "./RunEventsRepo";
import { ContactsRepo } from "./ContactsRepo";
import { QueueRepo } from "./QueueRepo";

export type Repos = {
  segments: SegmentsRepo;
  campaigns: CampaignsRepo;
  runs: RunsRepo;
  runEvents: RunEventsRepo;
  contacts: ContactsRepo;
  queueRepo: QueueRepo;
};

export function createRepos(db: Database.Database): Repos {
  return {
    segments: new SegmentsRepo(db),
    campaigns: new CampaignsRepo(db),
    runs: new RunsRepo(db),
    runEvents: new RunEventsRepo(db),
    contacts: new ContactsRepo(db),
    queueRepo: new QueueRepo(db as any),
  };
}
