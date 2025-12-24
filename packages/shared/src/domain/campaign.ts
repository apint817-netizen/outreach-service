export type CampaignMode = "cold" | "warm";

export type CampaignStep = {
  id: string;              // uuid
  order: number;           // 1..N
  text: string;            // template text
  delayAfterSec?: number;  // optional pause after this step
};

export type Campaign = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  mode: CampaignMode;
  segmentId: string | null;
  steps: CampaignStep[];
  isArchived: boolean;
};
