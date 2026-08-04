import { useState } from 'react'
import { api } from '../lib/api'

export function TaskActions({ projectId, taskId, onDeleted, onError }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const deleteTask = async () => {
    if (!window.confirm('Delete this task and all of its subtasks and comments? This cannot be undone.')) return

    setError('')
    setIsDeleting(true)

    try {
      const deletedTask = await api(`/tasks/${projectId}/t/${taskId}`, { method: 'DELETE' })
      onDeleted?.(deletedTask)
    } catch (err) {
      setError(err.message)
      onError?.(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return <div>
    {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
    <button
      type="button"
      onClick={deleteTask}
      disabled={isDeleting}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? 'Deleting…' : 'Delete task'}
    </button>
  </div>
}
