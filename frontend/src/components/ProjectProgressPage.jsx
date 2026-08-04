import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const statusLabels = { todo: "To do", in_progress: "In progress", in_review: "In review", done: "Done" };

export function ProjectProgressPage({ user }) {
  const { projectId } = useParams();
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/projects/${projectId}/progress`).then(setProgress).catch((requestError) => setError(requestError.message));
  }, [projectId]);

  return <AppLayout user={user}>
    <section><Link to={`/projects/${projectId}/tasks`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">← Back to project board</Link><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Project progress</h2><p className="mt-2 text-sm text-slate-500">A clear summary of task completion and current workload.</p></section>
    <nav className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4"><Link to={`/projects/${projectId}/tasks`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Board</Link><span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Progress</span><Link to={`/projects/${projectId}/members?mode=view`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Members</Link><Link to={`/projects/${projectId}/notes`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Notes</Link><Link to={`/projects/${projectId}/activity`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Activity</Link></nav>
    {error && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!progress && !error && <p className="mt-6 text-sm text-slate-500">Loading progress…</p>}
    {progress && <><section className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50/35 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">{progress.scope === "project" ? "Project completion" : "Your completion"}</p><h3 className="mt-1 text-3xl font-semibold text-slate-900">{progress.summary.completedPercentage}%</h3></div><p className="text-sm text-slate-500">{progress.summary.completedTasks} of {progress.summary.totalTasks} tasks complete</p></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Total tasks", progress.summary.totalTasks], ["Completed", progress.summary.completedTasks], ["Overdue", progress.summary.overdueTasks], ["In progress", progress.statusCounts.in_progress]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div></section><section className="mt-6 rounded-2xl border border-slate-200 bg-[#fffdf9] p-6"><h3 className="text-lg font-semibold text-slate-900">Tasks by status</h3><div className="mt-4 grid gap-3 sm:grid-cols-4">{Object.entries(statusLabels).map(([status, label]) => <div key={status} className="rounded-xl border border-slate-200/80 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{progress.statusCounts[status]}</p></div>)}</div></section>{progress.scope === "project" && <section className="mt-6 rounded-2xl border border-slate-200 bg-[#fffdf9] p-6"><h3 className="text-lg font-semibold text-slate-900">Member workload</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{progress.memberWorkload.map((workload) => <article key={workload.user._id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4"><div><p className="font-semibold text-slate-800">{workload.user.fullName || workload.user.username}</p><p className="mt-1 text-sm text-slate-500">{workload.role.replace("_", " ")}</p></div><p className="text-sm font-medium text-slate-600">{workload.totalTasks} tasks · {workload.overdueTasks} overdue</p></article>)}</div></section>}</>}
  </AppLayout>;
}
