import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const isManagerRole = (role) => role === "admin" || role === "project_admin";
const statusLabels = {
  todo: "To-Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export function ProjectProgressPage({ user }) {
  const { projectId } = useParams();
  const [role, setRole] = useState("");
  const [view, setView] = useState("");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [showMemberWorkload, setShowMemberWorkload] = useState(false);
  const [memberDetails, setMemberDetails] = useState(null);
  const [remindingTaskId, setRemindingTaskId] = useState("");
  const [remindedTaskIds, setRemindedTaskIds] = useState([]);
  const [expandedStatus, setExpandedStatus] = useState("");

  useEffect(() => {
    api(`/projects/${projectId}/members`)
      .then((members) =>
        setRole(
          members.find((member) => member.user._id === user._id)?.role ||
            "member",
        ),
      )
      .catch((requestError) => setError(requestError.message));
  }, [projectId, user._id]);

  const openProjectOverview = () => {
    setView("project");
    setProgress(null);
    setError("");
    setShowMemberWorkload(false);
    setMemberDetails(null);
    api(`/projects/${projectId}/progress`)
      .then(setProgress)
      .catch((requestError) => setError(requestError.message));
  };
  const openMember = (memberId) => {
    setError("");
    setMemberDetails(null);
    setExpandedStatus("");
    setRemindedTaskIds([]);
    api(`/projects/${projectId}/members/${memberId}/task-summary`)
      .then(setMemberDetails)
      .catch((requestError) => setError(requestError.message));
  };
  const sendReminder = async (taskId) => {
    setError("");
    setRemindingTaskId(taskId);
    try {
      await api(
        `/projects/${projectId}/members/${memberDetails.member._id}/tasks/${taskId}/reminder`,
        { method: "POST" },
      );
      setRemindedTaskIds((current) => [...current, taskId]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRemindingTaskId("");
    }
  };
  const manager = isManagerRole(role);

  return (
    <AppLayout user={user}>
      <section>
        <Link
          to={`/projects/${projectId}/tasks`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to My Workload
        </Link>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Progress
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Review progress across this project.
        </p>
      </section>
      <nav className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <Link
          to={`/projects/${projectId}/tasks`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          My Workload
        </Link>
        <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
          Progress
        </span>
        <Link
          to={`/projects/${projectId}/members`}
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
      </nav>
      {error && (
        <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {!view && manager && (
        <section className="mt-8 max-w-xl">
          <button
            type="button"
            onClick={openProjectOverview}
            className="w-full rounded-2xl border border-indigo-100 bg-[#fffdf9] p-6 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50"
          >
            <p className="text-sm font-semibold text-indigo-700">
              For project leaders
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Project overview
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              See completion, overdue work, and member task progress.
            </p>
          </button>
        </section>
      )}
      {!view && role && !manager && (
        <p className="mt-8 text-sm text-slate-500">
          Project progress is available to project leaders.
        </p>
      )}
      {view && !progress && !error && (
        <p className="mt-8 text-sm text-slate-500">Loading project overview…</p>
      )}
      {progress && (
        <>
          <section className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-700">
                Whole project
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                Project overview
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setView("");
                setProgress(null);
                setShowMemberWorkload(false);
                setMemberDetails(null);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
            >
              Back to progress choices
            </button>
          </section>
          <section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/35 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Completed</p>
                <h4 className="mt-1 text-3xl font-semibold text-slate-900">
                  {progress.summary.completedPercentage}%
                </h4>
              </div>
              <p className="text-sm text-slate-500">
                {progress.summary.completedTasks} of{" "}
                {progress.summary.totalTasks} tasks complete
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Total tasks", progress.summary.totalTasks],
                ["Completed", progress.summary.completedTasks],
                ["Overdue", progress.summary.overdueTasks],
                ["In progress", progress.statusCounts.in_progress],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200/80 bg-white p-4"
                >
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-6">
            <button
              type="button"
              onClick={() => setShowMemberWorkload((current) => !current)}
              className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              {showMemberWorkload
                ? "Hide member workload"
                : "View member workload"}
            </button>
            {showMemberWorkload && (
              <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#fffdf9]">
                <header className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Member workload
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a member to view their tasks.
                  </p>
                </header>
                <div className="space-y-1 p-2">
                  {progress.memberWorkload.map((workload) => (
                    <button
                      type="button"
                      key={workload.user._id}
                      onClick={() => openMember(workload.user._id)}
                      className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-3 py-3 text-left transition hover:bg-indigo-50/50"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {(
                          workload.user.fullName ||
                          workload.user.username ||
                          "M"
                        )
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-32 flex-1">
                        <p className="font-semibold text-slate-800">
                          {workload.user.fullName || workload.user.username}
                        </p>
                        <p className="text-xs text-slate-500">
                          {workload.role.replace("_", " ")}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {workload.totalTasks}
                        </span>{" "}
                        tasks
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-amber-700">
                          {workload.inReviewTasks}
                        </span>{" "}
                        in review
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-red-700">
                          {workload.overdueTasks}
                        </span>{" "}
                        overdue
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </section>
          {showMemberWorkload && !memberDetails && (
            <p className="mt-5 text-sm text-slate-500">
              Select a member to view task cards.
            </p>
          )}
          {memberDetails && (
            <section className="mt-6 border-t border-indigo-100 pt-6">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-indigo-700">
                    Member task view
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                    {memberDetails.member.fullName ||
                      memberDetails.member.username}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {memberDetails.totalTasks} total tasks · read-only for
                    project admins
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMemberDetails(null);
                    setExpandedStatus("");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                >
                  Close
                </button>
              </header>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(memberDetails.tasksByStatus).map(
                  ([status, tasks]) => (
                    <button
                      type="button"
                      key={status}
                      onClick={() =>
                        setExpandedStatus((current) =>
                          current === status ? "" : status,
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${expandedStatus === status ? "border-indigo-300 bg-indigo-50" : "border-indigo-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"}`}
                    >
                      <p className="text-sm font-medium text-slate-600">
                        {statusLabels[status]}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {tasks.length}
                      </p>
                    </button>
                  ),
                )}
              </div>
              {expandedStatus && (
                <section className="mt-5">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {statusLabels[expandedStatus]} tasks
                  </h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {memberDetails.tasksByStatus[expandedStatus].map((task) => (
                      <article
                        key={task._id}
                        className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm shadow-indigo-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h5 className="font-semibold text-slate-800">
                            {task.title}
                          </h5>
                          {["todo", "in_progress"].includes(expandedStatus) && (
                            <button
                              type="button"
                              onClick={() => sendReminder(task._id)}
                              disabled={
                                remindingTaskId === task._id ||
                                remindedTaskIds.includes(task._id)
                              }
                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                            >
                              {remindingTaskId === task._id
                                ? "Sending…"
                                : remindedTaskIds.includes(task._id)
                                  ? "Reminded"
                                  : "🔔 Remind"}
                            </button>
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {task.description || "No description added."}
                        </p>
                        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-indigo-50 pt-3 text-xs">
                          <div>
                            <dt className="text-slate-400">Priority</dt>
                            <dd className="mt-1 font-medium capitalize text-slate-700">
                              {task.priority}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Difficulty</dt>
                            <dd className="mt-1 font-medium capitalize text-slate-700">
                              {task.difficulty}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Due date</dt>
                            <dd className="mt-1 font-medium text-slate-700">
                              {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString()
                                : "No due date"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                    {!memberDetails.tasksByStatus[expandedStatus].length && (
                      <p className="text-sm text-slate-500">No tasks.</p>
                    )}
                  </div>
                </section>
              )}
            </section>
          )}
        </>
      )}
    </AppLayout>
  );
}
