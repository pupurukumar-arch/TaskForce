import { useState } from 'react'
import { api } from '../lib/api'
import { AppLayout } from './AppLayout'

export function ChangePasswordPage({ user }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Your password has been changed successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout user={user}>
      <div className="max-w-xl">
        <p className="text-sm text-slate-500">Account security</p>
        <h2 className="text-2xl font-bold text-slate-800">Change password</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use a strong password you do not use for another account.
        </p>

        <form onSubmit={submit} className="mt-7 rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
          {message && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <label className="mt-5 block text-sm font-medium text-slate-700">
            Current password
            <input
              required
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-indigo-400"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            New password
            <input
              required
              minLength="8"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-indigo-400"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Confirm new password
            <input
              required
              minLength="8"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-indigo-400"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
