import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { TaskActions } from './TaskActions'
import { TaskAttachments } from './TaskAttachments'
import { TaskDiscussion } from './TaskDiscussion'
import { TaskEditModal } from './TaskEditModal'
import { TaskSubtasks } from './TaskSubtasks'
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
  const [submittingReview, setSubmittingReview] = useState(false)
  const [editingSubtaskId, setEditingSubtaskId] = useState('')
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState('')
  const [savingSubtaskId, setSavingSubtaskId] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState('')
  const [error, setError] = useState('')
  const { projectId, taskId } = useParams()
  const navigate = useNavigate()

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

  const submitForReview = async (event) => {
    event?.preventDefault()
    if (submittingReview) return
    setError('')
    setSubmittingReview(true)
    try {
      const formData = new FormData()
      reviewFiles.forEach((file) => formData.append('attachments', file))
      if (comment.trim()) formData.append('comment', comment.trim())
      await api(`/tasks/${projectId}/t/${taskId}/submit-review`, { method: 'POST', body: formData })
      setReviewFiles([])
      setComment('')
      navigate(`/projects/${projectId}/tasks`)
    } catch (requestError) { setError(requestError.message) } finally { setSubmittingReview(false) }
  }

  if (!task) {
    return <AppLayout user={user}><p className="text-slate-600">Loading task…</p>{error && <p className="mt-4 text-red-700">{error}</p>}</AppLayout>
  }

  return <AppLayout user={user}>
    <Link to={`/projects/${projectId}/tasks`} className="text-sm text-indigo-600">← Back to tasks</Link>
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="orbit-task-detail rounded-2xl border p-6">
        <div className="flex justify-between gap-4">
          <div><p className="text-sm text-slate-500">Task details</p><h2 className="mt-1 text-2xl font-bold">{task.title}</h2></div>
          <span className="h-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{task.status.replace('_', ' ')}</span>
        </div>
        {isManager && <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => { setEditForm({ title: task.title, description: task.description || '', assignedTo: task.assignedTo?._id || '', priority: task.priority, difficulty: task.difficulty, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' }); setAttachmentFiles([]); setEditing(true) }} className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">Edit task</button><TaskActions projectId={projectId} taskId={taskId} onDeleted={() => { window.location.assign(`/projects/${projectId}/tasks`) }} onError={(requestError) => setError(requestError.message)} /></div>}
        {!isManager && canSubmitForReview(task, user._id) && <section className="mt-5 rounded-xl border border-blue-200 bg-blue-100/60 p-4"><p className="text-sm font-semibold text-blue-950">Submit completed work for review</p><p className="mt-1 text-xs text-blue-800">Choose up to five files, 1 MB each. Add an optional comment below, then submit once.</p><div className="mt-3"><TaskAttachments files={reviewFiles} onChange={setReviewFiles} onError={setError} disabled={submittingReview} /></div></section>}
        <p className="mt-4 text-slate-600">{task.description || 'No description added.'}</p>
        {task.attachments?.length > 0 && <section className="mt-5"><h3 className="text-sm font-semibold text-slate-700">Attached work</h3><div className="mt-2 flex flex-wrap gap-2">{[...new Map(task.attachments.map((attachment) => [`${attachment.mimetype}:${attachment.size}`, attachment])).values()].map((attachment) => <a key={attachment.key || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50">Open attachment</a>)}</div></section>}
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Assigned to</dt><dd className="mt-1 font-medium">{task.assignedTo?.fullName || task.assignedTo?.username || 'Unassigned'}</dd></div>
          <div><dt className="text-slate-500">Due date</dt><dd className="mt-1 font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</dd></div>
          <div><dt className="text-slate-500">Priority</dt><dd className="mt-1 font-medium capitalize">{task.priority}</dd></div>
          <div><dt className="text-slate-500">Difficulty</dt><dd className="mt-1 font-medium capitalize">{task.difficulty}</dd></div>
        </dl>
        <TaskDiscussion comments={comments} comment={comment} deletingCommentId={deletingCommentId} isManager={isManager} userId={user._id} onCommentChange={setComment} onDelete={deleteComment} onSubmit={!isManager && canSubmitForReview(task, user._id) ? submitForReview : addComment} submissionMode={!isManager && canSubmitForReview(task, user._id)} submitting={submittingReview} />
      </section>
      <TaskSubtasks task={task} isManager={isManager} subtaskTitle={subtaskTitle} editingSubtaskId={editingSubtaskId} editedSubtaskTitle={editedSubtaskTitle} savingSubtaskId={savingSubtaskId} onAdd={addSubtask} onTitleChange={setSubtaskTitle} onToggle={toggleSubtask} onStartEdit={(subtask) => { setEditingSubtaskId(subtask._id); setEditedSubtaskTitle(subtask.title) }} onEditedTitleChange={setEditedSubtaskTitle} onSave={saveSubtaskTitle} onCancelEdit={() => { setEditingSubtaskId(''); setEditedSubtaskTitle('') }} onDelete={deleteSubtask} />
    </div>
    {editing && <TaskEditModal form={editForm} members={members} files={attachmentFiles} onFormChange={setEditForm} onFilesChange={setAttachmentFiles} onClose={() => { setEditing(false); setAttachmentFiles([]) }} onSubmit={saveTask} />}
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
  </AppLayout>
}
