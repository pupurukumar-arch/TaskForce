import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from './AppLayout'
import { api } from '../lib/api'

export function ProjectNotesPage({ user }) {
  const projectId = window.location.pathname.split('/')[2]
  const [notes, setNotes] = useState([])
  const [role, setRole] = useState('')
  const [content, setContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [noteData, memberData] = await Promise.all([
        api(`/notes/${projectId}`),
        api(`/projects/${projectId}/members`),
      ])
      setNotes(noteData)
      setRole(memberData.find((member) => member.user._id === user._id)?.role || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, user._id])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const createNote = async (event) => {
    event.preventDefault()
    setError('')
    setIsCreating(true)

    try {
      const note = await api(`/notes/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      setNotes((currentNotes) => [note, ...currentNotes])
      setContent('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const isAdmin = role === 'admin'

  const saveNote = async (noteId) => {
    setError('')
    setIsSavingEdit(true)

    try {
      const updatedNote = await api(`/notes/${projectId}/n/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editingContent }),
      })
      setNotes((currentNotes) => currentNotes.map((note) => note._id === noteId ? updatedNote : note))
      setEditingNoteId('')
      setEditingContent('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const deleteNote = async (noteId) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return

    setError('')
    setDeletingNoteId(noteId)

    try {
      await api(`/notes/${projectId}/n/${noteId}`, { method: 'DELETE' })
      setNotes((currentNotes) => currentNotes.filter((note) => note._id !== noteId))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingNoteId('')
    }
  }

  return <AppLayout user={user}>
    <div className="flex items-end justify-between gap-4">
      <div>
        <a href={`/projects/${projectId}/tasks`} className="text-sm text-indigo-600">← Back to project</a>
        <h2 className="mt-2 text-2xl font-bold text-slate-800">Project notes</h2>
        <p className="mt-1 text-sm text-slate-500">Shared notes for everyone in this project.</p>
      </div>
    </div>

    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    {isAdmin && <form onSubmit={createNote} className="mt-6 rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">
        Add a note
        <textarea
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a useful update, decision, or reminder…"
          className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 text-slate-800 outline-indigo-400"
        />
      </label>
      <div className="mt-3 flex justify-end">
        <button disabled={isCreating} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {isCreating ? 'Saving…' : 'Add note'}
        </button>
      </div>
    </form>}

    {!isLoading && !isAdmin && <p className="mt-6 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">Only project administrators can add notes.</p>}

    <section className="mt-6 space-y-4">
      {isLoading && <p className="text-sm text-slate-600">Loading notes…</p>}
      {!isLoading && notes.map((note) => <article key={note._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {editingNoteId === note._id
          ? <div>
            <textarea
              required
              value={editingContent}
              onChange={(event) => setEditingContent(event.target.value)}
              className="min-h-28 w-full rounded-lg border border-slate-300 p-3 text-slate-800 outline-indigo-400"
            />
            <div className="mt-3 flex justify-end gap-3">
              <button onClick={() => { setEditingNoteId(''); setEditingContent('') }} disabled={isSavingEdit} className="text-sm text-slate-500">Cancel</button>
              <button onClick={() => saveNote(note._id)} disabled={isSavingEdit || !editingContent.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSavingEdit ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
          : <p className="whitespace-pre-wrap text-slate-700">{note.content}</p>}
        <p className="mt-4 text-xs text-slate-500">
          {note.createdBy?.fullName || note.createdBy?.username || 'Project member'} · {new Date(note.updatedAt).toLocaleString()}
        </p>
        {isAdmin && editingNoteId !== note._id && <div className="mt-3 flex justify-end gap-3">
          <button onClick={() => { setEditingNoteId(note._id); setEditingContent(note.content) }} className="text-sm font-medium text-indigo-600">Edit</button>
          <button onClick={() => deleteNote(note._id)} disabled={deletingNoteId === note._id} className="text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60">{deletingNoteId === note._id ? 'Deleting…' : 'Delete'}</button>
        </div>}
      </article>)}
      {!isLoading && !notes.length && <p className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">No notes have been added yet.</p>}
    </section>
  </AppLayout>
}
