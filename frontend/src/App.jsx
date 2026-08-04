import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { TaskDetailPage } from './components/TaskDetailPage'
import { NotificationsPage } from './components/NotificationsPage'
import { ProjectActivityPage } from './components/ProjectActivityPage'
import { ProjectProgressPage } from './components/ProjectProgressPage'
import { ProjectNotesPage } from './components/ProjectNotesPage'
import { ProjectMembersPage } from './components/ProjectMembersPage'
import { ForgotPasswordPage } from './components/ForgotPasswordPage'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { ProjectSettingsPage } from './components/ProjectSettingsPage'
import { InviteMemberPage } from './components/InviteMemberPage'
import { VerifyEmailPage } from './components/VerifyEmailPage'
import { ChangePasswordPage } from './components/ChangePasswordPage'
import { InvitationAcceptancePage } from './components/InvitationAcceptancePage'
import { DashboardPage } from './components/DashboardPage'
import { TaskBoardPage } from './components/TaskBoardPage'
import { ProfilePage as ProfileWorkspacePage } from './components/ProfilePage'
import { DeadlinesPage } from './components/DeadlinesPage'
import { CalendarPage } from './components/CalendarPage'
import { api, setToken } from './lib/api'

function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setResendMessage('')
    try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }); setToken(data.accessToken); const inviteToken = localStorage.getItem('orbit_invitation_token'); navigate(inviteToken ? `/projects/invitations/${inviteToken}/accept` : '/dashboard') }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  const resendVerification = async () => {
    setLoading(true); setError(''); setResendMessage('')
    try {
      await api('/auth/resend-email-verification', { method: 'POST', body: JSON.stringify({ email: form.email }) })
      setResendMessage('A fresh verification link was sent. Check your Mailtrap inbox.')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  const needsVerification = error.toLowerCase().includes('verify your email')
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5"><div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" /><div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" /><form onSubmit={submit} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-slate-100 shadow-2xl shadow-slate-950/50 backdrop-blur-xl"><div className="mb-8 text-center"><div className="orbit-title"><span className="orbit-mark" aria-hidden="true"><span className="orbit-mark__planet" /><span className="orbit-mark__ring" /></span><h1 className="bg-gradient-to-r from-white via-indigo-200 to-violet-300 bg-clip-text text-5xl font-extrabold tracking-[-0.06em] text-transparent drop-shadow-sm">Orbit</h1></div><div className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-indigo-300 to-transparent" /></div>{error && <p className="mt-5 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}{resendMessage && <p className="mt-5 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-200">{resendMessage}</p>}<label className="mt-6 block text-left text-sm font-medium text-slate-200">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-indigo-400" /></label><label className="mt-4 block text-left text-sm font-medium text-slate-200">Password<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-indigo-400" /></label><div className="mt-2 text-right"><Link to="/forgot-password" className="text-sm text-indigo-300 hover:text-white">Forgot password?</Link></div><button disabled={loading} className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-3 font-semibold text-white shadow-lg shadow-indigo-950/40 hover:brightness-110 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>{needsVerification && <button type="button" disabled={loading || !form.email} onClick={resendVerification} className="mt-3 w-full rounded-lg border border-indigo-300/40 p-3 text-sm font-semibold text-indigo-200 hover:bg-indigo-300/10 disabled:opacity-60">Resend verification email</button>}<p className="mt-5 text-center text-sm text-slate-300">New to Orbit? <Link to="/register" className="font-semibold text-indigo-300 hover:text-white">Create account</Link></p></form></main>
}

function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', fullName: '' }); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [fieldErrors, setFieldErrors] = useState({}); const [loading, setLoading] = useState(false)
  const change = (field, value) => { setForm({ ...form, [field]: value }); setFieldErrors({ ...fieldErrors, [field]: '' }) }
  const submit = async (event) => { event.preventDefault(); setLoading(true); setError(''); setFieldErrors({}); try { const inviteToken = new URLSearchParams(window.location.search).get('invite'); if (inviteToken) localStorage.setItem('orbit_invitation_token', inviteToken); await api('/auth/register', { method: 'POST', body: JSON.stringify(form) }); setMessage('Account created. Please verify the email sent to you before signing in.') } catch (err) { setError(err.message); setFieldErrors(err.fieldErrors || {}) } finally { setLoading(false) } }
  const inputClass = (field) => `w-full rounded-lg border bg-white/10 p-3 text-white outline-indigo-400 ${fieldErrors[field] ? 'border-red-400' : 'border-white/10'}`
  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-slate-100 shadow-2xl backdrop-blur-xl"><div className="mb-7 text-center"><h1 className="text-4xl font-extrabold text-white">Create account</h1><p className="mt-2 text-sm text-slate-300">Start planning with Orbit.</p></div>{message && <p className="rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-200">{message}</p>}{error && <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}<div className="mt-5 grid gap-4"><label className="text-sm">Full name <span className="text-slate-400">(optional)</span><input placeholder="For example: Puru Kumar" value={form.fullName} onChange={(e) => change('fullName', e.target.value)} className={`mt-1 ${inputClass('fullName')}`} />{fieldErrors.fullName && <FieldError text={fieldErrors.fullName} />}</label><label className="text-sm">Username<input required minLength="3" placeholder="lowercase, at least 3 characters" value={form.username} onChange={(e) => change('username', e.target.value.toLowerCase())} className={`mt-1 ${inputClass('username')}`} />{fieldErrors.username && <FieldError text={fieldErrors.username} />}</label><label className="text-sm">Email<input required type="email" placeholder="you@example.com" value={form.email} onChange={(e) => change('email', e.target.value)} className={`mt-1 ${inputClass('email')}`} />{fieldErrors.email && <FieldError text={fieldErrors.email} />}</label><label className="text-sm">Password<input required minLength="8" type="password" placeholder="at least 8 characters" value={form.password} onChange={(e) => change('password', e.target.value)} className={`mt-1 ${inputClass('password')}`} />{fieldErrors.password && <FieldError text={fieldErrors.password} />}<span className="mt-1 block text-xs text-slate-400">Use at least 8 characters for a safer password.</span></label></div><button disabled={loading} className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-3 font-semibold">{loading ? 'Creating account…' : 'Create account'}</button><p className="mt-5 text-center text-sm text-slate-300">Already have an account? <Link to="/login" className="font-semibold text-indigo-300">Sign in</Link></p></form></main>
}

function FieldError({ text }) { return <span className="mt-1 block text-xs text-red-300">{text}</span> }

function ProtectedApp() {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true)
  useEffect(() => { api('/auth/current-user', { method: 'POST' }).then(setUser).catch(() => setToken('')).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="grid min-h-screen place-items-center">Loading Orbit…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Routes><Route path="/dashboard" element={<DashboardPage user={user} />} /><Route path="/deadlines" element={<DeadlinesPage user={user} />} /><Route path="/calendar" element={<CalendarPage user={user} />} /><Route path="/change-password" element={<ChangePasswordPage user={user} />} /><Route path="/projects/invitations/:invitationToken/accept" element={<InvitationAcceptancePage user={user} />} /><Route path="/projects/:projectId/members" element={<ProjectMembersPage user={user} />} /><Route path="/projects/:projectId/invite" element={<InviteMemberPage user={user} />} /><Route path="/projects/:projectId/settings" element={<ProjectSettingsPage user={user} />} /><Route path="/projects/:projectId/activity" element={<ProjectActivityPage user={user} />} /><Route path="/projects/:projectId/notes" element={<ProjectNotesPage user={user} />} /><Route path="/projects/:projectId/progress" element={<ProjectProgressPage user={user} />} /><Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage user={user} />} /><Route path="/projects/:projectId/tasks" element={<TaskBoardPage user={user} />} /><Route path="/notifications" element={<NotificationsPage user={user} />} /><Route path="/profile" element={<ProfileWorkspacePage user={user} />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes>
}

export default function App() { return <Routes><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/verify-email/:verificationToken" element={<VerifyEmailPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password/:resetToken" element={<ResetPasswordPage />} /><Route path="/*" element={<ProtectedApp />} /></Routes> }
