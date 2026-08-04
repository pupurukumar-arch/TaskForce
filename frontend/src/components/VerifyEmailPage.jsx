import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export function VerifyEmailPage() {
  const { verificationToken, token } = useParams()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const tokenValue = verificationToken || token

  useEffect(() => {
    let isCurrent = true

    async function verifyEmail() {
      if (!tokenValue) {
        if (isCurrent) {
          setStatus('error')
          setError('This verification link is invalid or incomplete.')
        }
        return
      }

      try {
        await api(`/auth/verify-email/${tokenValue}`)
        if (isCurrent) setStatus('success')
      } catch (requestError) {
        if (isCurrent) {
          setStatus('error')
          setError(requestError.message)
        }
      }
    }

    verifyEmail()
    return () => {
      isCurrent = false
    }
  }, [tokenValue])

  const content =
    status === 'loading'
      ? { title: 'Verifying your email', message: 'Please wait while we confirm your email address.' }
      : status === 'success'
        ? { title: 'Email verified', message: 'Your email address is verified. You can now sign in.' }
        : { title: 'Verification failed', message: error || 'This verification link is invalid or has expired.' }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-100 shadow-2xl backdrop-blur-xl">
        <h1 className="text-4xl font-extrabold text-white">{content.title}</h1>
        <p
          className={`mt-4 rounded-lg p-4 text-sm ${
            status === 'error'
              ? 'bg-red-500/15 text-red-200'
              : status === 'success'
                ? 'bg-emerald-500/15 text-emerald-200'
                : 'bg-indigo-500/15 text-indigo-100'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {content.message}
        </p>
        {status !== 'loading' && (
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 px-5 py-3 font-semibold text-white hover:brightness-110"
          >
            Go to sign in
          </Link>
        )}
      </section>
    </main>
  )
}
