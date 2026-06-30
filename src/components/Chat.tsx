"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export type ChatMessage = {
  id: string;
  sender: string; // "guest" | "host"
  body: string;
  createdAt: string;
};

function timeNo(iso: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Gjenbrukbar chat. `meSide` = hvilken avsender regnes som "meg" (høyre side).
 * `pollUrl` hentes hvert 8. sekund. `onSend` sender en ny melding.
 */
export function Chat({
  initialMessages,
  meSide,
  pollUrl,
  onSend,
  emptyHint = "Ingen meldinger ennå. Skriv noe – vi svarer så snart vi kan.",
}: {
  initialMessages: ChatMessage[];
  meSide: "guest" | "host";
  pollUrl: string;
  onSend: (body: string) => Promise<void>;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const res = await fetch(pollUrl, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { messages: ChatMessage[] };
        setMessages(data.messages);
      }
    } catch {
      /* stille feil – prøver igjen ved neste poll */
    }
  }

  useEffect(() => {
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollUrl]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    start(async () => {
      await onSend(body);
      await refresh();
    });
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[360px] min-h-[160px] space-y-3 overflow-y-auto p-1">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-muted">{emptyHint}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender === meSide;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  mine ? "bg-brand text-white" : "bg-sand-dark text-ink",
                ].join(" ")}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <div className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-ink-muted"}`}>
                  {timeNo(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Skriv en melding …"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={pending || !text.trim()}>
          {pending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
