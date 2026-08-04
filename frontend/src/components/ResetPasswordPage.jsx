import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export function ResetPasswordPage() {
  const { resetToken, token } = useParams()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tokenValue = resetToken || token

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!tokenValue) {
      setError('This password-reset link is invalid or incomplete.')
      return
    }

    setIsSubmitting(true)

    try {
      await api(`/auth/reset-password/${tokenValue}`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      })
      setMessage('Your password has been reset. You can now sign in.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-slate-100 shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Choose a new password</h1>
          <p className="mt-2 text-sm text-slate-300">Use a strong password you have not used before.</p>
        </div>

        {message && (
          <p className="mt-5 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-200" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-lg bg-red-500/15 p-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        <label className="mt-6 block text-sm font-medium text-slate-200">
          New password
          <input
            required
            minLength="8"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-indigo-400"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-200">
          Confirm new password
          <input
            required
            minLength="8"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-indigo-400"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || Boolean(message)}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-3 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-300">
          <Link to="/login" className="font-semibold text-indigo-300 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
