import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const isManagerRole = (role) => role === "admin" || role === "project_admin";

export function ProjectProgressPage({ user }) {
  const { projectId } = useParams();
  const [role, setRole] = useState("");
  const [view, setView] = useState("");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [showMemberWorkload, setShowMemberWorkload] = useState(false);

  useEffect(() => {
    api(`/projects/${projectId}/members`)
      .then((members) => setRole(members.find((member) => member.user._id === user._id)?.role || "member"))
      .catch((requestError) => setError(requestError.message));
  }, [projectId, user._id]);

  const openProgress = (scope) => {
    setView(scope);
    setProgress(null);
    setError("");
    setShowMemberWorkload(false);
    api(`/projects/${projectId}/progress${scope === "personal" ? "?scope=personal" : ""}`)
      .then(setProgress)
      .catch((requestError) => setError(requestError.message));
  };

  const manager = isManagerRole(role);
  const heading = view === "project" ? "Project overview" : "My workload";

  return <AppLayout user={user}>
    <section><Link to={`/projects/${projectId}/tasks`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">← Back to project board</Link><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Progress</h2><p className="mt-2 text-sm text-slate-500">Choose the level of progress you want to review.</p></section>
    <nav className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4"><Link to={`/projects/${projectId}/tasks`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Board</Link><span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Progress</span><Link to={`/projects/${projectId}/members`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Members</Link><Link to={`/projects/${projectId}/notes`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Notes</Link><Link to={`/projects/${projectId}/activity`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Activity</Link></nav>
    {error && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!view && <section className={`mt-8 grid gap-5 ${manager ? "md:grid-cols-2" : "max-w-xl"}`}>
      {manager && <button type="button" onClick={() => openProgress("project")} className="rounded-2xl border border-indigo-100 bg-[#fffdf9] p-6 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50"><p className="text-sm font-semibold text-indigo-700">For project leaders</p><h3 className="mt-2 text-xl font-semibold text-slate-900">Project overview</h3><p className="mt-2 text-sm leading-6 text-slate-500">See completion, overdue work, and workload across the whole project.</p></button>}
      <button type="button" onClick={() => openProgress("personal")} className="rounded-2xl border border-indigo-100 bg-[#fffdf9] p-6 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50"><h3 className="text-xl font-semibold text-slate-900">My workload</h3><p className="mt-2 text-sm leading-6 text-slate-500">See only the tasks assigned to you in this project.</p></button>
    </section>}
    {view && !progress && !error && <p className="mt-8 text-sm text-slate-500">Loading {heading.toLowerCase()}…</p>}
    {progress && <><section className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-indigo-700">{progress.scope === "project" ? "Whole project" : "Assigned to you"}</p><h3 className="mt-1 text-2xl font-semibold text-slate-900">{heading}</h3></div><button type="button" onClick={() => { setView(""); setProgress(null); setShowMemberWorkload(false); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">Back to progress choices</button></section><section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/35 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Completed</p><h4 className="mt-1 text-3xl font-semibold text-slate-900">{progress.summary.completedPercentage}%</h4></div><p className="text-sm text-slate-500">{progress.summary.completedTasks} of {progress.summary.totalTasks} tasks complete</p></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Total tasks", progress.summary.totalTasks], ["Completed", progress.summary.completedTasks], ["Overdue", progress.summary.overdueTasks], ["In progress", progress.statusCounts.in_progress]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div></section>{progress.scope === "project" && <section className="mt-6"><button type="button" onClick={() => setShowMemberWorkload((current) => !current)} className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">{showMemberWorkload ? "Hide member workload" : "View member workload"}</button>{showMemberWorkload && <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#fffdf9]"><header className="border-b border-slate-100 px-5 py-4"><h3 className="text-lg font-semibold text-slate-900">Member workload</h3></header><div className="space-y-1 p-2">{progress.memberWorkload.map((workload) => <article key={workload.user._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-3 py-3 transition hover:bg-indigo-50/50"><span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{(workload.user.fullName || workload.user.username || "M").slice(0, 1).toUpperCase()}</span><div className="min-w-32 flex-1"><p className="font-semibold text-slate-800">{workload.user.fullName || workload.user.username}</p><p className="text-xs text-slate-500">{workload.role.replace("_", " ")}</p></div><p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">{workload.totalTasks}</span> tasks</p><p className="text-sm text-slate-600"><span className="font-semibold text-amber-700">{workload.inReviewTasks}</span> in review</p><p className="text-sm text-slate-600"><span className="font-semibold text-red-700">{workload.overdueTasks}</span> overdue</p></article>)}</div></section>}</section>}</>}
  </AppLayout>;
}
