export function TaskSubtasks({
  task,
  isManager,
  subtaskTitle,
  editingSubtaskId,
  editedSubtaskTitle,
  savingSubtaskId,
  onAdd,
  onTitleChange,
  onToggle,
  onStartEdit,
  onEditedTitleChange,
  onSave,
  onCancelEdit,
  onDelete,
}) {
  return <aside className="h-fit rounded-2xl border border-slate-200 bg-[#fffaf0] p-6 shadow-sm shadow-slate-200/40">
    <h3 className="font-semibold">Subtasks</h3>
    <div className="mt-4 space-y-3">
      {task.subtasks.map((subtask) => <article key={subtask._id} className="rounded-xl border border-amber-100 bg-[#fffdf9] p-3 text-sm">
        {editingSubtaskId === subtask._id ? <div className="flex gap-2"><input autoFocus value={editedSubtaskTitle} onChange={(event) => onEditedTitleChange(event.target.value)} className="min-w-0 flex-1 rounded border border-slate-300 p-2" /><button type="button" onClick={() => onSave(subtask._id)} disabled={savingSubtaskId === subtask._id} className="text-indigo-700 disabled:opacity-60">Save</button><button type="button" onClick={onCancelEdit} className="text-slate-500">Cancel</button></div> : <div className="flex items-center gap-3"><input type="checkbox" checked={subtask.isCompleted} onChange={() => onToggle(subtask)} /><span className={`min-w-0 flex-1 ${subtask.isCompleted ? 'text-slate-400 line-through' : ''}`}>{subtask.title}</span>{isManager && <><button type="button" onClick={() => onStartEdit(subtask)} className="text-xs font-medium text-indigo-700">Edit</button><button type="button" onClick={() => onDelete(subtask._id)} disabled={savingSubtaskId === subtask._id} className="text-xs font-medium text-red-700 disabled:opacity-60">{savingSubtaskId === subtask._id ? 'Deleting…' : 'Delete'}</button></>}</div>}
      </article>)}
      {!task.subtasks.length && <p className="text-sm text-slate-500">No subtasks yet.</p>}
    </div>
    {isManager && <form onSubmit={onAdd} className="mt-4 flex gap-2"><input required value={subtaskTitle} onChange={(event) => onTitleChange(event.target.value)} placeholder="Add subtask" className="min-w-0 flex-1 rounded-lg border border-amber-100 bg-[#fffdf9] p-3 text-sm" /><button className="rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white">Add</button></form>}
  </aside>
}
