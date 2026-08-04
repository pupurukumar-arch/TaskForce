import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";
import { canSubmitForReview, isManagerRole } from "../lib/taskAccess";

const columns = [
  { key: "todo", label: "To do", dot: "bg-slate-400", surface: "bg-slate-100/70" },
  { key: "in_progress", label: "In progress", dot: "bg-blue-500", surface: "bg-blue-50/70" },
  { key: "in_review", label: "In review", dot: "bg-amber-500", surface: "bg-amber-50/70" },
  { key: "done", label: "Done", dot: "bg-emerald-500", surface: "bg-emerald-50/70" },
];

const statusLabel = (status) => status?.replace("_", " ") || "To do";

function TaskCard({ task, projectId, user, isManager, onStatusChange, onApprove }) {
  const assignee = task.assignedTo?.fullName || task.assignedTo?.username || "Unassigned";
  const isDue = task.dueDate;

  return (
    <article className="rounded-xl border border-slate-200/80 bg-[#fffdf9] p-4 shadow-sm shadow-slate-200/50 transition hover:border-indigo-200 hover:bg-white hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        {isManager ? <h4 className="min-w-0 text-sm font-semibold leading-5 text-slate-800">{task.title}</h4> : <Link to={`/projects/${projectId}/tasks/${task._id}`} className="min-w-0 text-sm font-semibold leading-5 text-slate-800 transition hover:text-indigo-700">{task.title}</Link>}
        {task.priority && <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${task.priority === "high" ? "bg-red-50 text-red-700" : task.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{task.priority}</span>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Assigned to <span className="font-medium text-slate-700">{assignee}</span></p>
      {isManager && <Link to={`/projects/${projectId}/tasks/${task._id}`} className="mt-3 inline-flex rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">Edit task</Link>}
      {isManager ? <label className="mt-4 block text-xs font-medium text-slate-500">Move task<select value={task.status} onChange={(event) => onStatusChange(task, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="done">Done</option></select></label> : canSubmitForReview(task, user._id) ? <Link to={`/projects/${projectId}/tasks/${task._id}`} className="mt-4 inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">Attach work & submit</Link> : null}
      {isManager && task.status === "in_review" && <div className="mt-4 flex gap-2"><button onClick={() => onApprove(task, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button><button onClick={() => onApprove(task, false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Send back</button></div>}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="capitalize">{task.difficulty || "medium"}</span><span>{isDue ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : "No due date"}</span></div>
    </article>
  );
}

export function TaskBoardPage({ user }) {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [dueSummary, setDueSummary] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedView, setSelectedView] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: user._id, status: "todo", priority: "medium", difficulty: "medium", dueDate: "" });

  const load = useCallback(() => Promise.all([api(`/tasks/${projectId}`), api(`/projects/${projectId}/members`), api(`/tasks/${projectId}/due-summary`)]).then(([taskData, memberData, dueData]) => { setTasks(taskData); setMembers(memberData); setDueSummary(dueData); }).catch((requestError) => setError(requestError.message)), [projectId]);
  useEffect(() => { load(); }, [load]);

  const role = members.find((member) => member.user._id === user._id)?.role;
  const isManager = isManagerRole(role);
  const selectedColumn = columns.find((column) => column.key === selectedView?.value);
  const selectedTasks = selectedView?.type === "status"
    ? tasks.filter((task) => task.status === selectedView.value)
    : selectedView?.type === "due"
      ? (dueSummary?.[selectedView.value] || []).map((dueTask) => tasks.find((task) => task._id === dueTask._id) || dueTask)
      : [];
  const selectedLabel = selectedView?.type === "status"
    ? selectedColumn?.label
    : selectedView?.value === "dueToday" ? "Due today" : selectedView?.value === "dueThisWeek" ? "Due this week" : "Overdue";

  const createTask = async (event) => { event.preventDefault(); setCreating(true); setError(""); try { const task = await api(`/tasks/${projectId}`, { method: "POST", body: JSON.stringify({ ...form, dueDate: form.dueDate || undefined }) }); const assignee = members.find((member) => member.user._id === form.assignedTo)?.user; setTasks((currentTasks) => [{ ...task, assignedTo: assignee }, ...currentTasks]); setForm({ title: "", description: "", assignedTo: user._id, status: "todo", priority: "medium", difficulty: "medium", dueDate: "" }); setShowForm(false); } catch (requestError) { setError(requestError.message); } finally { setCreating(false); } };
  const updateStatus = async (task, status) => { try { const updated = await api(`/tasks/${projectId}/t/${task._id}`, { method: "PUT", body: JSON.stringify({ status }) }); setTasks((currentTasks) => currentTasks.map((item) => item._id === task._id ? { ...item, ...updated } : item)); } catch (requestError) { setError(requestError.message); } };
  const reviewTask = async (task, approved) => { try { const updated = await api(`/tasks/${projectId}/t/${task._id}/review`, { method: "POST", body: JSON.stringify({ approved }) }); setTasks((currentTasks) => currentTasks.map((item) => item._id === task._id ? { ...item, ...updated } : item)); } catch (requestError) { setError(requestError.message); } };

  return <AppLayout user={user}>
    <section className="flex flex-wrap items-end justify-between gap-5"><div><Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">← All projects</Link><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Project board</h2><p className="mt-2 text-sm text-slate-500">Plan tasks, track their status, and review completed work.</p></div>{isManager && <button onClick={() => setShowForm(true)} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">+ New task</button>}</section>
    <nav className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4"><span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Board</span><Link to={`/projects/${projectId}/progress`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Progress</Link><Link to={`/projects/${projectId}/members?mode=view`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Members</Link><Link to={`/projects/${projectId}/notes`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Notes</Link><Link to={`/projects/${projectId}/activity`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Activity</Link>{role === "admin" && <Link to={`/projects/${projectId}/settings`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Settings</Link>}</nav>
    <section className="mt-8 grid gap-3 sm:grid-cols-3">{[["dueToday", "Due today"], ["dueThisWeek", "Due this week"], ["overdue", "Overdue"]].map(([key, label]) => <button key={key} onClick={() => setSelectedView((current) => current?.type === "due" && current.value === key ? null : { type: "due", value: key })} className={`rounded-2xl border p-4 text-left transition ${selectedView?.type === "due" && selectedView.value === key ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-[#fffdf9] hover:border-indigo-200 hover:bg-indigo-50/50"}`}><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{dueSummary?.counts?.[key] ?? "—"}</p></button>)}</section>
    {error && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-8"><div className="flex flex-wrap gap-3">{columns.map((column) => <button key={column.key} onClick={() => setSelectedView((current) => current?.type === "status" && current.value === column.key ? null : { type: "status", value: column.key })} className={`flex min-w-36 flex-1 items-center justify-between rounded-xl border px-4 py-3 text-left transition ${selectedView?.type === "status" && selectedView.value === column.key ? "border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-100" : "border-slate-200 bg-[#fffdf9] hover:border-indigo-200 hover:bg-indigo-50/50"}`}><span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />{column.label}</span><span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-500">{tasks.filter((task) => task.status === column.key).length}</span></button>)}</div>{selectedView && <section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/35 p-5 shadow-sm shadow-slate-200/30"><header className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Task focus</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedLabel}</h3></div><button onClick={() => setSelectedView(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Close view</button></header><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{selectedTasks.map((task) => <TaskCard key={task._id} task={task} projectId={projectId} user={user} isManager={isManager} onStatusChange={updateStatus} onApprove={reviewTask} />)}{!selectedTasks.length && <p className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">No tasks in this view.</p>}</div></section>}</section>
    {showForm && <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm"><form onSubmit={createTask} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"><p className="text-sm font-medium text-indigo-600">Project work</p><h3 className="mt-1 text-2xl font-semibold text-slate-900">Create a task</h3><label className="mt-6 block text-sm font-medium text-slate-700">Task title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label><label className="mt-4 block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label><label className="mt-4 block text-sm font-medium text-slate-700">Assign to<select value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">{members.map((member) => <option key={member.user._id} value={member.user._id}>{member.user.fullName || member.user.username} ({statusLabel(member.role)})</option>)}</select></label><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="text-sm font-medium text-slate-700">Difficulty<select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label className="text-sm font-medium text-slate-700">Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={creating} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{creating ? "Creating…" : "Create task"}</button></div></form></div>}
  </AppLayout>;
}
