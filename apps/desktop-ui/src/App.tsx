import { useState } from "react";
import { SegmentsPanel } from "./components/SegmentsPanel";
import { CampaignsPanel } from "./components/CampaignsPanel";
import { RunsPanel } from "./components/RunsPanel";
import { BackendStatus } from "./components/BackendStatus";
import { ContactsList } from "./components/ContactsList";
import { ImportContacts } from "./components/ImportContacts";

type Tab = "contacts" | "segments" | "campaigns" | "runs";

export default function App() {
  const [tab, setTab] = useState<Tab>("contacts");

  return (
    <div style={{ padding: 12 }}>
      <BackendStatus />

      <nav style={{ display: "flex", gap: 12, padding: 12 }}>
        <button onClick={() => setTab("contacts")}>Контакты</button>
        <button onClick={() => setTab("segments")}>Сегменты</button>
        <button onClick={() => setTab("campaigns")}>Кампании</button>
        <button onClick={() => setTab("runs")}>Runs</button>
      </nav>

      {tab === "contacts" && (
        <div style={{ display: "grid", gap: 16 }}>
          <ImportContacts />
          <ContactsList />
        </div>
      )}

      {tab === "segments" && <SegmentsPanel />}
      {tab === "campaigns" && <CampaignsPanel />}
      {tab === "runs" && <RunsPanel />}
    </div>
  );
}
