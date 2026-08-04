import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from './AppLayout'
import { api } from '../lib/api'

export function ProjectSettingsPage({ user }) {
  const projectId = window.location.pathname.split('/')[2]
  const [form, setForm] = useState({ name: '', description: '' })
  const [role, setRole] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadProject = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [project, members] = await Promise.all([
        api(`/projects/${projectId}`),
        api(`/projects/${projectId}/members`),
      ])
      setForm({ name: project.name || '', description: project.description || '' })
      setRole(members.find((member) => member.user._id === user._id)?.role || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, user._id])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const saveProject = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsSaving(true)

    try {
      const project = await api(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setForm({ name: project.name || '', description: project.description || '' })
      setMessage('Project settings saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteProject = async () => {
    if (!window.confirm('Delete this project and all of its tasks, notes, and members? This cannot be undone.')) return

    setMessage('')
    setError('')
    setIsDeleting(true)

    try {
      await api(`/projects/${projectId}`, { method: 'DELETE' })
      window.location.assign('/dashboard')
    } catch (err) {
      setError(err.message)
      setIsDeleting(false)
    }
  }

  const isAdmin = role === 'admin'

  return <AppLayout user={user}>
    <a href={`/projects/${projectId}/tasks`} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">Back to project</a>
    <div className="mt-4">
      <h2 className="text-2xl font-bold text-slate-800">Project settings</h2>
      <p className="mt-1 text-sm text-slate-500">Manage the project name, description, and deletion settings.</p>
    </div>

    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

    {isLoading && <p className="mt-6 text-sm text-slate-600">Loading project settings…</p>}

    {!isLoading && !isAdmin && <p className="mt-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">Only project administrators can change project settings.</p>}

    {!isLoading && isAdmin && <>
      <form onSubmit={saveProject} className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-[#fffdf9] p-6 shadow-sm shadow-slate-200/40">
        <label className="block text-sm font-medium text-slate-700">
          Project name
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-800 outline-indigo-400"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Description <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 text-slate-800 outline-indigo-400"
          />
        </label>
        <div className="mt-5 flex justify-end">
          <button disabled={isSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-[#fffdf9] p-6 shadow-sm shadow-slate-200/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project management</p><h3 className="mt-2 font-semibold text-slate-800">Delete this project</h3>
        <p className="mt-2 text-sm text-slate-500">This permanently removes its tasks, notes, and member records.</p>
        <button onClick={deleteProject} disabled={isDeleting} className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
          {isDeleting ? 'Deleting…' : 'Delete project'}
        </button>
      </section>
    </>}
  </AppLayout>
}
