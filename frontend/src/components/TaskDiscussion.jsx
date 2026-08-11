export function TaskDiscussion({
  comments,
  comment,
  deletingCommentId,
  isManager,
  userId,
  onCommentChange,
  onDelete,
  onSubmit,
  submissionMode = false,
  submitting = false,
}) {
  return <section className="mt-8 border-t border-slate-200 pt-6">
    <h3 className="font-semibold">Comments</h3>
    <div className="mt-4 space-y-3">
      {comments.map((item) => <article key={item._id} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm shadow-indigo-50">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm">{item.content}</p><p className="mt-1 text-xs text-slate-500">{item.user?.fullName || item.user?.username || 'Member'}</p></div>
          {(isManager || item.user?._id === userId) && <button type="button" onClick={() => onDelete(item._id)} disabled={deletingCommentId === item._id} className="shrink-0 text-xs font-medium text-red-700 disabled:opacity-60">{deletingCommentId === item._id ? 'Deleting…' : 'Delete'}</button>}
        </div>
      </article>)}
      {!comments.length && <p className="text-sm text-slate-500">No comments yet.</p>}
    </div>
    <form onSubmit={onSubmit} className="mt-4 flex gap-2">
      <input required={!submissionMode} value={comment} onChange={(event) => onCommentChange(event.target.value)} placeholder={submissionMode ? "Add a comment for the project admin" : "Write a comment"} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3" />
      <button disabled={submitting} className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Submitting…" : submissionMode ? "Submit for Review" : "Post"}</button>
    </form>
  </section>
}
