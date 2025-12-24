import { CampaignsRepo } from "./CampaignsRepo.js";
import { SegmentsRepo } from "./SegmentsRepo.js";
import { QueueRepo } from "./QueueRepo.js";
import { ContactsRepo } from "./ContactsRepo.js";
import { RunsRepo } from "./RunsRepo.js";
import { RunEventsRepo } from "./RunEventsRepo.js";

export type Repos = {
  campaigns: CampaignsRepo;
  segments: SegmentsRepo;
  queue: QueueRepo;
  contacts: ContactsRepo;
  runs: RunsRepo;
  events: RunEventsRepo;
};

export function createRepos(db: any): Repos {
  return {
    campaigns: new CampaignsRepo(db),
    segments: new SegmentsRepo(db),
    queue: new QueueRepo(db),
    contacts: new ContactsRepo(db),
    runs: new RunsRepo(db),
    events: new RunEventsRepo(db),
  };
}
