import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const roleLabel = {
  admin: "Project owner",
  project_admin: "Project admin",
  member: "Member",
};

function StatCard({ label, value, accent, onClick, isSelected }) {
  return (
    <button onClick={onClick} className={`group w-full rounded-2xl border p-5 text-left shadow-sm shadow-slate-200/40 transition ${isSelected ? "border-indigo-300 bg-indigo-50/80 shadow-indigo-100/70" : "border-slate-200/80 bg-[#fffdf9] hover:border-indigo-200 hover:bg-indigo-50/50"}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`block h-2 w-10 rounded-full ${accent}`} />
        <span className="text-xs font-medium text-slate-400 transition group-hover:text-indigo-600">View</span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </button>
  );
}

function ProjectCard({ project, role }) {
  return (
    <article className="group flex min-h-60 flex-col rounded-2xl border border-slate-200/80 bg-[#fffdf9] p-6 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg hover:shadow-indigo-100/60">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-200">
          {project.name?.slice(0, 1).toUpperCase() || "P"}
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {roleLabel[role] || role}
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
        <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
          {project.description || "No project description yet."}
        </p>
      </div>

      <div className="mt-auto border-t border-slate-100 pt-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {project.members || 0}
          </span>
          members
        </div>
        <div>
          <Link to={`/projects/${project._id}/tasks`} className="block rounded-lg bg-indigo-50 px-3 py-2.5 text-center text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-800">
            Open project
          </Link>
        </div>
      </div>
    </article>
  );
}

export function DashboardPage({ user }) {
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [taskView, setTaskView] = useState("");
  const [previewTasks, setPreviewTasks] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    Promise.all([api("/projects"), api("/auth/task-summary")])
      .then(([projectData, summaryData]) => {
        setProjects(projectData);
        setSummary(summaryData);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const createProject = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const project = await api("/projects", {
        method: "POST",
        body: JSON.stringify(projectForm),
      });
      setProjects((currentProjects) => [
        { project: { ...project, members: 1 }, role: "admin" },
        ...currentProjects,
      ]);
      setProjectForm({ name: "", description: "" });
      setShowProjectForm(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  };

  const showMyTasks = async (view) => {
    if (taskView === view) {
      setTaskView("");
      return;
    }

    setTaskView(view);
    setIsLoadingPreview(true);
    try {
      const taskLists = await Promise.all(projects.map(async ({ project }) => ({
        project,
        tasks: await api(`/tasks/${project._id}`),
      })));
      const myTasks = taskLists.flatMap(({ project, tasks }) => tasks.filter((task) => task.assignedTo?._id === user._id).map((task) => ({ ...task, projectName: project.name, projectId: project._id })));
      setPreviewTasks(view === "inProgress" ? myTasks.filter((task) => task.status === "in_progress") : myTasks);
    } catch (requestError) {
      setError(requestError.message);
      setTaskView("");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <AppLayout user={user}>
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Workspace overview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Keep your work moving</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A calm view of your projects, assigned work, and what needs attention next.</p>
        </div>
        <button onClick={() => setShowProjectForm(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-indigo-300">
          + New project
        </button>
      </section>

      {error && <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned tasks" value={summary?.totalTasks ?? "—"} accent="bg-indigo-500" onClick={() => showMyTasks("assigned")} isSelected={taskView === "assigned"} />
        <StatCard label="In progress" value={summary?.inProgressTasks ?? "—"} accent="bg-indigo-400" onClick={() => showMyTasks("inProgress")} isSelected={taskView === "inProgress"} />
        <StatCard label="Active projects" value={projects.length} accent="bg-indigo-300" onClick={() => document.getElementById("your-projects")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
      </section>

      {taskView && <section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/35 p-5 shadow-sm shadow-slate-200/30"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Task focus</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{taskView === "inProgress" ? "In-progress tasks" : "Assigned tasks"}</h3></div><button onClick={() => setTaskView("")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Close</button></div>{isLoadingPreview ? <p className="mt-5 text-sm text-slate-500">Loading tasks…</p> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{previewTasks.map((task) => <Link key={task._id} to={`/projects/${task.projectId}/tasks/${task._id}`} className="rounded-xl border border-slate-200/80 bg-[#fffdf9] p-4 transition hover:border-indigo-200 hover:bg-white"><p className="font-semibold text-slate-800">{task.title}</p><p className="mt-2 text-xs text-slate-500">{task.projectName} · {task.status.replace("_", " ")}</p></Link>)}{!previewTasks.length && <p className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">No tasks in this view.</p>}</div>}</section>}

      <section id="your-projects" className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Your projects</h3>
            <p className="mt-1 text-sm text-slate-500">Open a project to manage tasks, members, notes, and activity.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{projects.length} total</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map(({ project, role }) => <ProjectCard key={project._id} project={project} role={role} />)}
          {!projects.length && <div className="col-span-full rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center"><p className="text-lg font-semibold text-slate-800">Your workspace is ready.</p><p className="mt-2 text-sm text-slate-500">Create your first project to start assigning and reviewing work.</p><button onClick={() => setShowProjectForm(true)} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create project</button></div>}
        </div>
      </section>

      {showProjectForm && <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm"><form onSubmit={createProject} className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><p className="text-sm font-medium text-indigo-600">New workspace</p><h3 className="mt-1 text-2xl font-semibold text-slate-900">Create a project</h3><p className="mt-2 text-sm text-slate-500">Give your team a clear place to plan and deliver work.</p><label className="mt-6 block text-sm font-medium text-slate-700">Project name<input required autoFocus value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label><label className="mt-4 block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span><textarea value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setShowProjectForm(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={creating} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60">{creating ? "Creating…" : "Create project"}</button></div></form></div>}
    </AppLayout>
  );
}
