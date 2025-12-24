export type ContactChannel = "whatsapp";
export type ContactStatus = "active" | "blocked" | "invalid" | "opted_out";

export type Contact = {
  id: string;
  createdAt: string;
  updatedAt: string;

  displayName: string;
  phoneE164: string;
  channel: ContactChannel;

  status: ContactStatus;
  tags: string[];
  notes: string;
};
