import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, RegisterPage } from './components/AuthPages'
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
import { ProfilePage } from './components/ProfilePage'
import { DeadlinesPage } from './components/DeadlinesPage'
import { CalendarPage } from './components/CalendarPage'
import { ProjectBriefPage } from './components/ProjectBriefPage'
import { api, setToken } from './lib/api'

function ProtectedApp() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/auth/current-user', { method: 'POST' })
      .then(setUser)
      .catch(() => setToken(''))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="grid min-h-screen place-items-center">Loading Orbit…</div>
  if (!user) return <Navigate to="/login" replace />

  return <Routes>
    <Route path="/dashboard" element={<DashboardPage user={user} />} />
    <Route path="/deadlines" element={<DeadlinesPage user={user} />} />
    <Route path="/calendar" element={<CalendarPage user={user} />} />
    <Route path="/change-password" element={<ChangePasswordPage user={user} />} />
    <Route path="/projects/invitations/:invitationToken/accept" element={<InvitationAcceptancePage user={user} />} />
    <Route path="/projects/:projectId/members" element={<ProjectMembersPage user={user} />} />
    <Route path="/projects/:projectId/invite" element={<InviteMemberPage user={user} />} />
    <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage user={user} />} />
    <Route path="/projects/:projectId/activity" element={<ProjectActivityPage user={user} />} />
    <Route path="/projects/:projectId/notes" element={<ProjectNotesPage user={user} />} />
    <Route path="/projects/:projectId/progress" element={<ProjectProgressPage user={user} />} />
    <Route path="/projects/:projectId/brief" element={<ProjectBriefPage user={user} />} />
    <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage user={user} />} />
    <Route path="/projects/:projectId/tasks" element={<TaskBoardPage user={user} />} />
    <Route path="/notifications" element={<NotificationsPage user={user} />} />
    <Route path="/profile" element={<ProfilePage user={user} />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/verify-email/:verificationToken" element={<VerifyEmailPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password/:resetToken" element={<ResetPasswordPage />} />
    <Route path="/*" element={<ProtectedApp />} />
  </Routes>
}
