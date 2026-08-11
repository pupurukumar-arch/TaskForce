import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";
import { isManagerRole } from "../lib/taskAccess";
import { useBackgroundRefresh } from "../lib/useBackgroundRefresh";
import { TaskCard, TaskCreateModal } from "./TaskBoardParts";

const columns = [
  {
    key: "todo",
    label: "To do",
    dot: "bg-slate-400",
    surface: "bg-slate-100/70",
  },
  {
    key: "in_progress",
    label: "In progress",
    dot: "bg-blue-500",
    surface: "bg-blue-50/70",
  },
  {
    key: "in_review",
    label: "In review",
    dot: "bg-amber-500",
    surface: "bg-amber-50/70",
  },
  {
    key: "done",
    label: "Done",
    dot: "bg-emerald-500",
    surface: "bg-emerald-50/70",
  },
];

export function TaskBoardPage({ user }) {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [dueSummary, setDueSummary] = useState(null);
  const [error, setError] = useState("");
  const [updatingStatusIds, setUpdatingStatusIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedView, setSelectedView] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: user._id,
    status: "todo",
    priority: "medium",
    difficulty: "medium",
    dueDate: "",
  });

  const load = useCallback(
    () =>
      Promise.all([
        api(`/tasks/${projectId}`),
        api(`/projects/${projectId}/members`),
        api(`/tasks/${projectId}/due-summary`),
      ])
        .then(([taskData, memberData, dueData]) => {
          setTasks(taskData);
          setMembers(memberData);
          setDueSummary(dueData);
        })
        .catch((requestError) => setError(requestError.message)),
    [projectId],
  );
  useEffect(() => {
    load();
  }, [load]);
  useBackgroundRefresh(load);

  const role = members.find((member) => member.user._id === user._id)?.role;
  const isManager = isManagerRole(role);
  const assignedToCurrentUser = (task) => task.assignedTo?._id === user._id;
  const workloadTasks = (status) =>
    tasks.filter((task) => {
      if (task.status !== status) return false;
      return status === "in_review" && isManager
        ? true
        : assignedToCurrentUser(task);
    });
  const selectedColumn = columns.find(
    (column) => column.key === selectedView?.value,
  );
  const selectedTasks =
    selectedView?.type === "status"
      ? workloadTasks(selectedView.value)
      : selectedView?.type === "due"
        ? (dueSummary?.[selectedView.value] || []).map(
            (dueTask) =>
              tasks.find((task) => task._id === dueTask._id) || dueTask,
          )
        : [];
  const selectedLabel =
    selectedView?.type === "status"
      ? selectedColumn?.label
      : selectedView?.value === "dueToday"
        ? "Due today"
        : selectedView?.value === "dueThisWeek"
          ? "Due this week"
          : "Overdue";

  const createTask = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const task = await api(`/tasks/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ ...form, dueDate: form.dueDate || undefined }),
      });
      const assignee = members.find(
        (member) => member.user._id === form.assignedTo,
      )?.user;
      setTasks((currentTasks) => [
        { ...task, assignedTo: assignee },
        ...currentTasks,
      ]);
      setForm({
        title: "",
        description: "",
        assignedTo: user._id,
        status: "todo",
        priority: "medium",
        difficulty: "medium",
        dueDate: "",
      });
      setShowForm(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  };
  const updateStatus = async (task, status) => {
    if (task.status === status || updatingStatusIds.includes(task._id)) return;
    const previousTask = task;
    setError("");
    setUpdatingStatusIds((current) => [...current, task._id]);
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item._id === task._id ? { ...item, status } : item,
      ),
    );
    try {
      const updated = await api(`/tasks/${projectId}/t/${task._id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item._id === task._id ? { ...item, ...updated } : item,
        ),
      );
      void api(`/tasks/${projectId}/due-summary`)
        .then(setDueSummary)
        .catch(() => {});
    } catch (requestError) {
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item._id === task._id && item.status === status
            ? { ...item, ...previousTask }
            : item,
        ),
      );
      setError(requestError.message);
    } finally {
      setUpdatingStatusIds((current) =>
        current.filter((taskId) => taskId !== task._id),
      );
    }
  };
  const reviewTask = async (task, approved) => {
    try {
      const updated = await api(`/tasks/${projectId}/t/${task._id}/review`, {
        method: "POST",
        body: JSON.stringify({ approved }),
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item._id === task._id ? { ...item, ...updated } : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <AppLayout user={user}>
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← All projects
          </Link>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Project board
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Plan tasks, track their status, and review completed work.
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            + New task
          </button>
        )}
      </section>
      <nav className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
          My Workload
        </span>
        <Link
          to={`/projects/${projectId}/progress`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Project Intelligence and Progress
        </Link>
        <Link
          to={`/projects/${projectId}/members?mode=view`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Members
        </Link>
        <Link
          to={`/projects/${projectId}/notes`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Notes
        </Link>
        <Link
          to={`/projects/${projectId}/brief`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Project Brief
        </Link>
        <Link
          to={`/projects/${projectId}/activity`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Activity
        </Link>
        {role === "admin" && (
          <Link
            to={`/projects/${projectId}/settings`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            Settings
          </Link>
        )}
      </nav>
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["dueToday", "Due today"],
          ["dueThisWeek", "Due this week"],
          ["overdue", "Overdue"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              setSelectedView((current) =>
                current?.type === "due" && current.value === key
                  ? null
                  : { type: "due", value: key },
              )
            }
            className={`rounded-2xl border p-4 text-left transition ${selectedView?.type === "due" && selectedView.value === key ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-[#fffdf9] hover:border-indigo-200 hover:bg-indigo-50/50"}`}
          >
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {dueSummary?.counts?.[key] ?? "—"}
            </p>
          </button>
        ))}
      </section>
      {error && (
        <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="mt-8">
        <div className="flex flex-wrap gap-3">
          {columns.map((column) => (
            <button
              key={column.key}
              onClick={() =>
                setSelectedView((current) =>
                  current?.type === "status" && current.value === column.key
                    ? null
                    : { type: "status", value: column.key },
                )
              }
              className={`flex min-w-36 flex-1 items-center justify-between rounded-xl border px-4 py-3 text-left transition ${selectedView?.type === "status" && selectedView.value === column.key ? "border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-100" : "border-slate-200 bg-[#fffdf9] hover:border-indigo-200 hover:bg-indigo-50/50"}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                {column.label}
              </span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                {workloadTasks(column.key).length}
              </span>
            </button>
          ))}
        </div>
        {selectedView && (
          <section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/35 p-5 shadow-sm shadow-slate-200/30">
            <header className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Task focus</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {selectedLabel}
                </h3>
              </div>
              <button
                onClick={() => setSelectedView(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close view
              </button>
            </header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  projectId={projectId}
                  user={user}
                  isManager={isManager}
                  isStatusUpdating={updatingStatusIds.includes(task._id)}
                  onStatusChange={updateStatus}
                  onApprove={reviewTask}
                />
              ))}
              {!selectedTasks.length && (
                <p className="col-span-full py-8 text-center text-sm text-slate-500">
                  No tasks.
                </p>
              )}
            </div>
          </section>
        )}
      </section>
      {showForm && (
        <TaskCreateModal
          projectId={projectId}
          form={form}
          setForm={setForm}
          members={members}
          role={role}
          creating={creating}
          onClose={() => setShowForm(false)}
          onSubmit={createTask}
        />
      )}
    </AppLayout>
  );
}
