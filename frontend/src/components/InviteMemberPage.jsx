import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const getProjectIdFromPath = () => window.location.pathname.split("/")[2];

export function InviteMemberPage({ user, projectId = getProjectIdFromPath() }) {
  const [form, setForm] = useState({ email: "", role: "member" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    api(`/projects/${projectId}/members`)
      .then((members) => setRole(members.find((member) => member.user._id === user._id)?.role || "member"))
      .catch((requestError) => setError(requestError.message));
  }, [projectId, user._id]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!projectId) {
      setError("Project ID is missing.");
      return;
    }

    setLoading(true);
    try {
      await api(`/projects/${projectId}/invitations`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(`An invitation was sent to ${form.email}.`);
      setForm({ email: "", role: "member" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout user={user}>
      <Link
        to={`/projects/${projectId}/tasks`}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← Back to project board
      </Link>
      <section className="mt-3 max-w-xl rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Project team</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">
          Invite a member
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Invite someone who is not yet registered on Orbit to collaborate on this project.
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {role === null ? <p className="mt-6 text-sm text-slate-600">Checking project permission…</p> : role !== "admin" ? <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Only the project Admin can send invitations.</p> : <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="member@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800 outline-indigo-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Project role
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800 outline-indigo-400"
            >
              <option value="member">Member</option>
              <option value="project_admin">Project admin</option>
            </select>
          </label>

          <button
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending invitation…" : "Send invitation"}
          </button>
        </form>}
      </section>
    </AppLayout>
  );
}
