import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { AuthShell } from './OrbitStarfield'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage('If the account exists, a password-reset link has been sent to its email address.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-slate-100 shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Reset password</h1>
          <p className="mt-2 text-sm text-slate-300">
            Enter your email and we will send you a reset link.
          </p>
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
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-indigo-400"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-3 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-300">
          <Link to="/login" className="font-semibold text-indigo-300 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
