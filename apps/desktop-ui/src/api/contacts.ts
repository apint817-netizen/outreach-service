import type { Contact } from "@outreach/shared";

const API_BASE = "http://127.0.0.1:3001";

export type ContactsListResponse = { items: Contact[] };

export async function fetchContacts(signal?: AbortSignal): Promise<ContactsListResponse> {
  const res = await fetch(API_BASE + "/contacts", { signal });
  if (!res.ok) throw new Error("contacts_http_" + res.status);
  return (await res.json()) as ContactsListResponse;
}
