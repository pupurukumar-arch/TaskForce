import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const roleLabel = {
  admin: "Project owner",
  project_admin: "Project admin",
  member: "Member",
};

function ProjectCard({ project, role, onOpen }) {
  return (
    <article
      onDoubleClick={onOpen}
      title="Double-click to open project"
      className="group flex min-h-60 flex-col rounded-2xl border border-slate-200/80 bg-[#fffdf9] p-6 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg hover:shadow-indigo-100/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-200 bg-indigo-100 text-sm font-bold text-indigo-700 shadow-sm shadow-indigo-100">
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
          <Link
            to={`/projects/${project._id}/tasks`}
            className="block rounded-lg bg-indigo-50 px-3 py-2.5 text-center text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-800"
          >
            Open project
          </Link>
        </div>
      </div>
    </article>
  );
}

export function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    brief: null,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api("/projects")
      .then((projectData) => {
        setProjects(projectData);
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
        body: (() => {
          const formData = new FormData();
          formData.append("name", projectForm.name);
          if (projectForm.description)
            formData.append("description", projectForm.description);
          if (projectForm.brief) formData.append("brief", projectForm.brief);
          return formData;
        })(),
      });
      setProjects((currentProjects) => [
        { project: { ...project, members: 1 }, role: "admin" },
        ...currentProjects,
      ]);
      setProjectForm({ name: "", description: "", brief: null });
      setShowProjectForm(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout user={user}>
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Workspace overview
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Keep your work moving
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Choose a project to plan work, collaborate with your team, and track
            progress.
          </p>
        </div>
        <button
          onClick={() => setShowProjectForm(true)}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-indigo-300"
        >
          + New project
        </button>
      </section>

      {error && (
        <p className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <section id="your-projects" className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Your projects
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Open a project to manage tasks, members, notes, and activity.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {projects.length} total
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map(({ project, role }) => (
            <ProjectCard
              key={project._id}
              project={project}
              role={role}
              onOpen={() => navigate(`/projects/${project._id}/tasks`)}
            />
          ))}
          {!projects.length && (
            <div className="col-span-full p-10 text-center">
              <p className="text-lg font-semibold text-slate-800">
                No projects yet.
              </p>
              <button
                onClick={() => setShowProjectForm(true)}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Create project
              </button>
            </div>
          )}
        </div>
      </section>

      {showProjectForm && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm">
          <form
            onSubmit={createProject}
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
          >
            <p className="text-sm font-medium text-indigo-600">New workspace</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">
              Create a project
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Give your team a clear place to plan and deliver work.
            </p>
            {error && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <label className="mt-6 block text-sm font-medium text-slate-700">
              Project name
              <input
                required
                autoFocus
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, name: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Description{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    description: event.target.value,
                  })
                }
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <section className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-800">Project Brief</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Share instructions, scope, and expected outcomes with every project member.
              </p>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    brief: event.target.files?.[0] || null,
                  })
                }
                className="mt-3 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-600 hover:file:bg-slate-100"
              />
              <p className="mt-2 text-xs text-slate-500">PDF or DOCX · maximum 5 MB</p>
            </section>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={creating}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
