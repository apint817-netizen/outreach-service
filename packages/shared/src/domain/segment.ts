export type SegmentMode = "cold" | "warm";

export type SegmentRule =
  | { field: "status"; op: "in"; value: string[] }
  | { field: "tags"; op: "any"; value: string[] }
  | { field: "tags"; op: "all"; value: string[] }
  | { field: "channel"; op: "in"; value: string[] };

export type Segment = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string | null;
  mode: SegmentMode;
  rules: SegmentRule[];
  isArchived: boolean;
};
