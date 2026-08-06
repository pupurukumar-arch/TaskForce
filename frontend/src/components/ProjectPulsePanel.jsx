import { useRef, useState } from "react";
import { getToken } from "../lib/api";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export function ProjectPulsePanel({ projectId }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const answerRef = useRef("");

  const ask = async (event) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) return;

    setError("");
    setQuestion("");
    setIsAsking(true);
    answerRef.current = "";
    setMessages((current) => [...current, { role: "user", text: trimmedQuestion }, { role: "assistant", text: "" }]);
    try {
      const response = await fetch(`${baseUrl}/projects/${projectId}/pulse/ask`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Project Pulse could not start");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const eventText of events) {
          const eventName = eventText.match(/^event:\s*(.+)$/m)?.[1];
          const rawData = eventText.match(/^data:\s*(.+)$/m)?.[1];
          if (!rawData) continue;
          const data = JSON.parse(rawData);
          if (eventName === "token") {
            answerRef.current += data.text || "";
            setMessages((current) => current.map((message, index) =>
              index === current.length - 1 ? { ...message, text: answerRef.current } : message,
            ));
          }
          if (eventName === "error") throw new Error(data.message || "Project Pulse could not answer");
        }
      }
    } catch (requestError) {
      setError(requestError.message);
      if (!answerRef.current) setMessages((current) => current.slice(0, -1));
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm shadow-violet-100/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Project intelligence</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Project Pulse</h3>
          <p className="mt-1 text-sm text-slate-600">Ask about this project’s tasks, deadlines, people, notes, and activity.</p>
        </div>
        <button onClick={() => setOpen((value) => !value)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
          {open ? "Close Project Pulse" : "Ask Project Pulse"}
        </button>
      </div>
      {open && (
        <div className="mt-5 border-t border-violet-100 pt-5">
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {!messages.length && <p className="rounded-xl bg-white/80 p-4 text-sm text-slate-500">Try: “Which tasks are overdue?” or “Who has the highest workload?”</p>}
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`rounded-xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-8 bg-violet-600 text-white" : "mr-8 border border-slate-200 bg-white text-slate-700"}`}>
                {message.text || <span className="text-slate-400">Thinking…</span>}
              </article>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <form onSubmit={ask} className="mt-4 flex gap-2">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={800} placeholder="Ask a question about this project…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            <button disabled={isAsking || !question.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isAsking ? "Thinking…" : "Ask"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
