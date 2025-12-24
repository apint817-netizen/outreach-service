import { useEffect, useState } from "react";
import { fetchContacts } from "../api/contacts";

type Contact = {
  id: string;
  displayName: string;
  phoneE164: string;
  status: string;
  tags: string[];
};

export function ContactsList() {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    fetchContacts(ctrl.signal)
      .then((res) => {
        setItems(res.items as any);
        setError(null);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Ошибка загрузки контактов");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  if (loading) return <div>Загрузка контактов…</div>;
  if (error) return <div style={{ color: "#c66" }}>{error}</div>;

  return (
    <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        Контакты: {items.length}
      </div>

      {items.map((c) => (
        <div
          key={c.id}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #2a2a2a",
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {c.displayName} {c.phoneE164}
          </div>

          <div style={{ opacity: 0.8 }}>
            статус: {c.status === "active" ? "активен" : c.status}
            {c.tags && c.tags.length > 0 ? ` | теги: ${c.tags.join(", ")}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

