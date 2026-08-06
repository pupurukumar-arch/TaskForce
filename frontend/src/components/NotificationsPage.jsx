import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { AppLayout } from './AppLayout'
import { useBackgroundRefresh } from '../lib/useBackgroundRefresh'

function formatDate(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleString()
}

export function NotificationsPage({ user }) {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [markingReadId, setMarkingReadId] = useState('')

  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  const loadNotifications = useCallback(async (showLoading = false) => {
      if (showLoading) setIsLoading(true)
      setError('')

      try {
        const data = await api('/notifications')
        setNotifications(data)
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        if (showLoading) setIsLoading(false)
      }
    }, [])

  useEffect(() => {
    loadNotifications(true)
  }, [loadNotifications])
  useBackgroundRefresh(loadNotifications)

  async function markAsRead(notificationId) {
    setMarkingReadId(notificationId)
    setError('')

    try {
      const updatedNotification = await api(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId ? updatedNotification : notification,
        ),
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setMarkingReadId('')
    }
  }

  return (
    <AppLayout user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-600">Workspace updates</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Notifications</h2>
          <p className="mt-2 text-sm text-slate-500">Updates about your tasks, team, and projects.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
          {unreadCount} unread
        </span>
      </div>

      {error && (
        <p className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-200/40">
          Loading notifications…
        </p>
      ) : notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-[#fffdf9] p-10 text-center shadow-sm shadow-slate-200/30"><p className="text-lg font-semibold text-slate-800">You are all caught up.</p><p className="mt-2 text-sm text-slate-500">New task assignments, project invitations, and mentions will appear here.</p></div>
      ) : (
        <div className="mt-8 space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification._id}
              className="rounded-2xl border border-slate-200 bg-[#fffdf9] p-5 text-slate-700 shadow-sm shadow-slate-200/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`inline rounded-md px-1.5 py-1 font-medium leading-6 ${notification.isRead ? "" : "bg-indigo-50 text-slate-800"}`}>{notification.message}</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification._id)}
                    disabled={markingReadId === notification._id}
                    className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingReadId === notification._id ? 'Saving…' : 'Mark read'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
