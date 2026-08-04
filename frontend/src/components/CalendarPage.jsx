import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabel = (date) => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
const monthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function CalendarPage({ user }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedDate(null);
    setError("");
    api(`/tasks/my-calendar?month=${monthValue(month)}`).then((data) => setTasks(data.tasks || [])).catch((requestError) => setError(requestError.message));
  }, [month]);

  const tasksByDate = useMemo(() => tasks.reduce((groups, task) => {
    const key = dateKey(new Date(task.dueDate));
    groups[key] = [...(groups[key] || []), task];
    return groups;
  }, {}), [tasks]);
  const firstDay = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1));
  const selectedTasks = selectedDate ? tasksByDate[dateKey(selectedDate)] || [] : [];

  return <AppLayout user={user}>
    <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Personal planning</p><h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Calendar</h2><p className="mt-2 text-sm text-slate-500">Your assigned task deadlines for the month.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[#fffdf9] p-1"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-indigo-50">←</button><span className="min-w-36 text-center text-sm font-semibold text-slate-800">{monthLabel(month)}</span><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-indigo-50">→</button></div></section>
    {error && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-[#fffdf9] shadow-sm shadow-slate-200/30"><div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">{weekdays.map((day) => <div key={day} className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">{day}</div>)}</div><div className="grid grid-cols-7">{cells.map((date, index) => { if (!date) return <div key={`blank-${index}`} className="min-h-24 border-b border-r border-slate-100 bg-slate-50/30" />; const dayTasks = tasksByDate[dateKey(date)] || []; return <button key={dateKey(date)} onClick={() => dayTasks.length && setSelectedDate(date)} className={`min-h-24 border-b border-r border-slate-100 p-2 text-left transition ${dayTasks.length ? "hover:bg-indigo-50/60" : "cursor-default"}`}><span className="grid h-7 w-7 place-items-center rounded-full text-sm font-medium text-slate-700">{date.getDate()}</span>{dayTasks.length > 0 && <span className="mt-2 block rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}</span>}</button>; })}</div></section>
    {selectedDate && <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><section className="w-full max-w-md rounded-2xl bg-[#fffdf9] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Tasks due</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "long" })}</h3></div><button onClick={() => setSelectedDate(null)} className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button></div><div className="mt-5 space-y-3">{selectedTasks.map((task) => <Link key={task._id} to={`/projects/${task.project?._id}/tasks/${task._id}`} onClick={() => setSelectedDate(null)} className="block rounded-xl border border-slate-100 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"><p className="font-semibold text-slate-800">{task.title}</p><p className="mt-1 text-sm text-slate-500">{task.project?.name || "Project"}</p></Link>)}</div></section></div>}
  </AppLayout>;
}
