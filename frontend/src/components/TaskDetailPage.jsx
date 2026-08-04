import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from './AppLayout'
import { TaskActions } from './TaskActions'
import { TaskAttachments } from './TaskAttachments'
import { api } from '../lib/api'
import { canSubmitForReview, isManagerRole } from '../lib/taskAccess'

export function TaskDetailPage({ user }) {
  const [task, setTask] = useState(null)
  const [members, setMembers] = useState([])
  const [comments, setComments] = useState([])
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [comment, setComment] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [attachmentFiles, setAttachmentFiles] = useState([])
  const [reviewFiles, setReviewFiles] = useState([])
  const [editingSubtaskId, setEditingSubtaskId] = useState('')
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState('')
  const [savingSubtaskId, setSavingSubtaskId] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState('')
  const [error, setError] = useState('')
  const parts = window.location.pathname.split('/')
  const projectId = parts[2]
  const taskId = parts[4]

  const load = useCallback(() => Promise.all([
    api(`/tasks/${projectId}/t/${taskId}`),
    api(`/projects/${projectId}/members`),
    api(`/tasks/${projectId}/t/${taskId}/comments`),
  ]).then(([taskData, memberData, commentData]) => {
    setTask(taskData)
    setMembers(memberData)
    setComments(commentData)
  }).catch((requestError) => setError(requestError.message)), [projectId, taskId])

  useEffect(() => { load() }, [load])

  const role = members.find((member) => member.user._id === user._id)?.role
  const isManager = isManagerRole(role)

  const addSubtask = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api(`/tasks/${projectId}/t/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ title: subtaskTitle }),
      })
      setSubtaskTitle('')
      load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const toggleSubtask = async (subtask) => {
    setError('')
    try {
      await api(`/tasks/${projectId}/st/${subtask._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: !subtask.isCompleted }),
      })
      load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const saveSubtaskTitle = async (subtaskId) => {
    const title = editedSubtaskTitle.trim()
    if (!title) {
      setError('Subtask title is required.')
      return
    }

    setError('')
    setSavingSubtaskId(subtaskId)
    try {
      await api(`/tasks/${projectId}/st/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      })
      setEditingSubtaskId('')
      setEditedSubtaskTitle('')
      load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingSubtaskId('')
    }
  }

  const deleteSubtask = async (subtaskId) => {
    if (!window.confirm('Delete this subtask? This cannot be undone.')) return

    setError('')
    setSavingSubtaskId(subtaskId)
    try {
      await api(`/tasks/${projectId}/st/${subtaskId}`, { method: 'DELETE' })
      load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingSubtaskId('')
    }
  }

  const addComment = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api(`/tasks/${projectId}/t/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment }),
      })
      setComment('')
      load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return

    setError('')
    setDeletingCommentId(commentId)
    try {
      await api(`/tasks/${projectId}/t/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      })
      setComments((currentComments) => currentComments.filter((item) => item._id !== commentId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingCommentId('')
    }
  }

  const saveTask = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const formData = new FormData()
      Object.entries({ ...editForm, dueDate: editForm.dueDate || undefined }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, value)
      })
      attachmentFiles.forEach((file) => formData.append('attachments', file))
      await api(`/tasks/${projectId}/t/${taskId}`, {
        method: 'PUT',
        body: formData,
      })
      setEditing(false)
      setAttachmentFiles([])
      load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const submitForReview = async () => {
    setError('')
    try {
      const formData = new FormData()
      reviewFiles.forEach((file) => formData.append('attachments', file))
      await api(`/tasks/${projectId}/t/${taskId}/submit-review`, { method: 'POST', body: formData })
      setReviewFiles([])
      load()
    } catch (requestError) { setError(requestError.message) }
  }

  if (!task) {
    return <AppLayout user={user}><p className="text-slate-600">Loading task…</p>{error && <p className="mt-4 text-red-700">{error}</p>}</AppLayout>
  }

  return <AppLayout user={user}>
    <a href={`/projects/${projectId}/tasks`} className="text-sm text-indigo-600">← Back to tasks</a>
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="rounded-2xl border border-slate-200 bg-[#fffdf9] p-6 shadow-sm shadow-slate-200/40">
        <div className="flex justify-between gap-4">
          <div><p className="text-sm text-slate-500">Task details</p><h2 className="mt-1 text-2xl font-bold">{task.title}</h2></div>
          <span className="h-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{task.status.replace('_', ' ')}</span>
        </div>
        {isManager && <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => { setEditForm({ title: task.title, description: task.description || '', assignedTo: task.assignedTo?._id || '', priority: task.priority, difficulty: task.difficulty, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' }); setAttachmentFiles([]); setEditing(true) }} className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">Edit task</button><TaskActions projectId={projectId} taskId={taskId} onDeleted={() => { window.location.assign(`/projects/${projectId}/tasks`) }} onError={(requestError) => setError(requestError.message)} /></div>}
        {!isManager && canSubmitForReview(task, user._id) && <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-medium text-amber-900">Submit completed work for review</p><p className="mt-1 text-xs text-amber-800">Attach screenshots, documents, or other evidence before submitting.</p><div className="mt-3"><TaskAttachments files={reviewFiles} onChange={setReviewFiles} /></div><button onClick={submitForReview} className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Mark ready for review</button></section>}
        <p className="mt-4 text-slate-600">{task.description || 'No description added.'}</p>
        {task.attachments?.length > 0 && <section className="mt-5"><h3 className="text-sm font-semibold text-slate-700">Attached work</h3><div className="mt-2 flex flex-wrap gap-2">{task.attachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">Open attachment</a>)}</div></section>}
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Assigned to</dt><dd className="mt-1 font-medium">{task.assignedTo?.fullName || task.assignedTo?.username || 'Unassigned'}</dd></div>
          <div><dt className="text-slate-500">Due date</dt><dd className="mt-1 font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</dd></div>
          <div><dt className="text-slate-500">Priority</dt><dd className="mt-1 font-medium capitalize">{task.priority}</dd></div>
          <div><dt className="text-slate-500">Difficulty</dt><dd className="mt-1 font-medium capitalize">{task.difficulty}</dd></div>
        </dl>
        <section className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="font-semibold">Comments</h3>
          <div className="mt-4 space-y-3">
            {comments.map((item) => <article key={item._id} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm shadow-indigo-50"><div className="flex items-start justify-between gap-3"><div><p className="text-sm">{item.content}</p><p className="mt-1 text-xs text-slate-500">{item.user?.fullName || item.user?.username || 'Member'}</p></div>{(isManager || item.user?._id === user._id) && <button type="button" onClick={() => deleteComment(item._id)} disabled={deletingCommentId === item._id} className="shrink-0 text-xs font-medium text-red-700 disabled:opacity-60">{deletingCommentId === item._id ? 'Deleting…' : 'Delete'}</button>}</div></article>)}
            {!comments.length && <p className="text-sm text-slate-500">No comments yet.</p>}
          </div>
          <form onSubmit={addComment} className="mt-4 flex gap-2"><input required value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment" className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3" /><button className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white">Post</button></form>
        </section>
      </section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-[#fffaf0] p-6 shadow-sm shadow-slate-200/40">
        <h3 className="font-semibold">Subtasks</h3>
        <div className="mt-4 space-y-3">
          {task.subtasks.map((subtask) => <article key={subtask._id} className="rounded-xl border border-amber-100 bg-[#fffdf9] p-3 text-sm">
            {editingSubtaskId === subtask._id ? <div className="flex gap-2"><input autoFocus value={editedSubtaskTitle} onChange={(event) => setEditedSubtaskTitle(event.target.value)} className="min-w-0 flex-1 rounded border border-slate-300 p-2" /><button type="button" onClick={() => saveSubtaskTitle(subtask._id)} disabled={savingSubtaskId === subtask._id} className="text-indigo-700 disabled:opacity-60">Save</button><button type="button" onClick={() => { setEditingSubtaskId(''); setEditedSubtaskTitle('') }} className="text-slate-500">Cancel</button></div> : <div className="flex items-center gap-3"><input type="checkbox" checked={subtask.isCompleted} onChange={() => toggleSubtask(subtask)} /><span className={`min-w-0 flex-1 ${subtask.isCompleted ? 'text-slate-400 line-through' : ''}`}>{subtask.title}</span>{isManager && <><button type="button" onClick={() => { setEditingSubtaskId(subtask._id); setEditedSubtaskTitle(subtask.title) }} className="text-xs font-medium text-indigo-700">Edit</button><button type="button" onClick={() => deleteSubtask(subtask._id)} disabled={savingSubtaskId === subtask._id} className="text-xs font-medium text-red-700 disabled:opacity-60">{savingSubtaskId === subtask._id ? 'Deleting…' : 'Delete'}</button></>}</div>}
          </article>)}
          {!task.subtasks.length && <p className="text-sm text-slate-500">No subtasks yet.</p>}
        </div>
        {isManager && <form onSubmit={addSubtask} className="mt-4 flex gap-2"><input required value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add subtask" className="min-w-0 flex-1 rounded-lg border border-amber-100 bg-[#fffdf9] p-3 text-sm" /><button className="rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white">Add</button></form>}
      </aside>
    </div>
    {editing && <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/35 p-5"><form onSubmit={saveTask} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold">Edit task</h3><label className="mt-4 block text-sm">Title<input required value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label><label className="mt-3 block text-sm">Description<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label><label className="mt-3 block text-sm">Assign to<select value={editForm.assignedTo} onChange={(event) => setEditForm({ ...editForm, assignedTo: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3">{members.map((member) => <option key={member.user._id} value={member.user._id}>{member.user.fullName || member.user.username}</option>)}</select></label><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-sm">Priority<select value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="text-sm">Difficulty<select value={editForm.difficulty} onChange={(event) => setEditForm({ ...editForm, difficulty: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label className="text-sm">Due date<input type="date" value={editForm.dueDate} onChange={(event) => setEditForm({ ...editForm, dueDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label></div><div className="mt-4"><TaskAttachments files={attachmentFiles} onChange={setAttachmentFiles} /></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setEditing(false); setAttachmentFiles([]) }} className="text-sm text-slate-500">Cancel</button><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save changes</button></div></form></div>}
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  </AppLayout>
}
