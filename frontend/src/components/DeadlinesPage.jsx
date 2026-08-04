import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const groups = [
  ["dueToday", "Due today", "bg-indigo-500"],
  ["dueThisWeek", "This week", "bg-indigo-400"],
  ["overdue", "Overdue", "bg-rose-400"],
];

export function DeadlinesPage({ user }) {
  const [deadlines, setDeadlines] = useState(null);
  const [activeGroup, setActiveGroup] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/tasks/my-deadlines").then(setDeadlines).catch((requestError) => setError(requestError.message));
  }, []);

  const tasks = deadlines?.[activeGroup] || [];
  return <AppLayout user={user}>
    <section><p className="text-sm font-medium text-slate-500">Personal planning</p><h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Deadlines</h2><p className="mt-2 text-sm text-slate-500">A focused view of the work assigned to you.</p></section>
    {error && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-8 grid gap-3 sm:grid-cols-3">{groups.map(([key, label, accent]) => <button key={key} onClick={() => setActiveGroup((current) => current === key ? "" : key)} className={`rounded-2xl border p-5 text-left transition ${activeGroup === key ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-[#fffdf9] hover:border-indigo-200 hover:bg-indigo-50/50"}`}><span className={`mb-5 block h-2 w-10 rounded-full ${accent}`} /><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold text-slate-900">{deadlines?.counts?.[key] ?? "—"}</p></button>)}</section>
    {activeGroup && <section className="mt-6 rounded-2xl border border-slate-200 bg-[#fffdf9] p-5 shadow-sm shadow-slate-200/30"><div><p className="text-sm font-medium text-slate-500">Selected deadline view</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{groups.find(([key]) => key === activeGroup)?.[1]}</h3></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tasks.map((task) => <Link key={task._id} to={`/projects/${task.project?._id}/tasks/${task._id}`} className="rounded-xl border border-slate-100 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"><p className="font-semibold text-slate-800">{task.title}</p><p className="mt-2 text-sm text-slate-500">{task.project?.name || "Project"}</p><p className="mt-3 text-xs font-medium text-slate-600">Due {new Date(task.dueDate).toLocaleDateString()}</p></Link>)}{deadlines && !tasks.length && <p className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nothing in this deadline view.</p>}{!deadlines && <p className="col-span-full text-sm text-slate-500">Loading deadlines…</p>}</div></section>}
  </AppLayout>;
}
