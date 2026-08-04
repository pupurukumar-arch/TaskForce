import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { api, clearToken } from "../lib/api";

const links = [
  ["Dashboard", "/dashboard"],
  ["Deadlines", "/deadlines"],
  ["Calendar", "/calendar"],
  ["Notifications", "/notifications", true],
  ["Profile", "/profile"],
];

export function AppLayout({ user, children }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNightTheme, setIsNightTheme] = useState(() => localStorage.getItem("orbit_theme") === "night");
  useEffect(() => {
    api("/notifications")
      .then((items) =>
        setUnreadCount(items.filter((item) => !item.isRead).length),
      )
      .catch(() => {});
  }, []);
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      clearToken();
      navigate("/login");
    }
  };
  const toggleTheme = () => {
    setIsNightTheme((current) => {
      const next = !current;
      localStorage.setItem("orbit_theme", next ? "night" : "light");
      return next;
    });
  };
  return (
    <div className={`orbit-app min-h-screen bg-[#f6f8fc] text-slate-800 md:flex ${isNightTheme ? "orbit-theme-night" : ""}`}>
      <aside className="flex flex-col bg-[#11182b] p-4 text-slate-300 shadow-xl md:sticky md:top-0 md:min-h-screen md:w-64">
        <div className="mb-10 flex items-center gap-3 px-2 pt-2">
          <span className="orbit-workspace-mark grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-950/40">O</span>
          <div><p className="text-lg font-semibold tracking-tight text-white">Orbit</p><p className="text-xs text-slate-400">Team workspace</p></div>
        </div>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
        <nav className="space-y-1">
          {links.map(([label, to, showsUnreadCount]) => (
            <NavLink
              key={label}
              to={to}
              aria-label={
                showsUnreadCount && unreadCount > 0
                  ? `${label}, ${unreadCount} unread`
                  : label
              }
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/25" : "text-slate-300 hover:bg-white/8 hover:text-white"}`
              }
            >
              <span>{label}</span>
              {showsUnreadCount && unreadCount > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-2 pt-4"><button onClick={logout} className="w-full rounded-xl px-2 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-200">Sign out</button></div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mx-auto mb-10 flex max-w-7xl items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back, <span className="font-semibold text-indigo-700">{user?.fullName || user?.username || "Orbit member"}</span></h1><p className="mt-1 text-sm text-slate-500">Here is what is happening across your projects.</p></div>
          <div className="flex items-center gap-3"><button type="button" onClick={toggleTheme} aria-label={isNightTheme ? "Switch to light theme" : "Switch to midnight theme"} title={isNightTheme ? "Switch to light theme" : "Switch to midnight theme"} className="orbit-theme-lens grid h-10 w-10 place-items-center rounded-full border border-indigo-100 bg-white shadow-sm transition hover:-translate-y-0.5" /><Link to="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700 ring-4 ring-white transition hover:ring-indigo-100">{user?.username?.slice(0, 1).toUpperCase() || "U"}</Link></div>
        </header>
        <div className="orbit-page-content mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
