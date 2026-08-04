import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

export function ProfilePage({ user }) {
  const [skills, setSkills] = useState("");
  const [savedSkills, setSavedSkills] = useState(user?.skills || []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveSkills = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const newSkills = skills.split(",").map((skill) => skill.trim()).filter(Boolean);
      const updatedUser = await api("/auth/profile/skills", {
        method: "PUT",
        body: JSON.stringify({ skills: [...new Set([...savedSkills, ...newSkills])] }),
      });
      setSavedSkills(updatedUser.skills || []);
      setSkills("");
      setMessage("Skills saved.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <AppLayout user={user}>
    <section><p className="text-sm font-medium text-indigo-600">Account</p><h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Profile & preferences</h2><p className="mt-2 text-sm text-slate-500">Keep your information and professional skills up to date.</p></section>
    <section className="mt-8 grid max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-2xl border border-slate-200 bg-[#fffdf9] p-6 shadow-sm shadow-slate-200/40"><div className="flex items-center gap-4 border-b border-slate-100 pb-6"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-xl font-bold text-indigo-700">{user?.username?.slice(0, 1).toUpperCase() || "U"}</span><div><h3 className="text-lg font-semibold text-slate-900">{user?.fullName || user?.username}</h3><p className="mt-1 text-sm text-slate-500">{user?.email}</p></div></div><dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Username</dt><dd className="mt-2 font-medium text-slate-800">@{user?.username}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account status</dt><dd className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</dd></div></dl><form onSubmit={saveSkills} className="mt-7 border-t border-slate-100 pt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Skills</h3><p className="mt-1 text-sm text-slate-500">Used by project admins to understand your strengths.</p></div></div><div className="mt-4 flex flex-wrap gap-2">{savedSkills.length ? savedSkills.map((skill) => <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{skill}</span>) : <span className="text-sm text-slate-500">No skills added yet.</span>}</div><label className="mt-5 block text-sm font-medium text-slate-700">Add skills <span className="font-normal text-slate-400">(separate with commas)</span><input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="React, Node.js, MongoDB" className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>{message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}{error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}<button className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Save skills</button></form></article>
      <aside className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm shadow-indigo-100/30"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg shadow-sm">⌁</span><h3 className="mt-5 text-lg font-semibold text-slate-900">Account security</h3><p className="mt-2 text-sm leading-6 text-slate-600">Change your password here whenever you want to keep your Orbit account secure.</p><Link to="/change-password" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 transition hover:bg-indigo-100">Change password</Link></aside>
    </section>
  </AppLayout>;
}
