import { TaskAttachments } from './TaskAttachments'

export function TaskEditModal({ form, members, files, onFormChange, onFilesChange, onClose, onSubmit }) {
  return <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/35 p-5">
    <form onSubmit={onSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <h3 className="text-xl font-bold">Edit task</h3>
      <label className="mt-4 block text-sm">Title<input required value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
      <label className="mt-3 block text-sm">Description<textarea value={form.description} onChange={(event) => onFormChange({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
      <label className="mt-3 block text-sm">Assign to<select value={form.assignedTo} onChange={(event) => onFormChange({ ...form, assignedTo: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3">{members.map((member) => <option key={member.user._id} value={member.user._id}>{member.user.fullName || member.user.username}</option>)}</select></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-sm">Priority<select value={form.priority} onChange={(event) => onFormChange({ ...form, priority: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="text-sm">Difficulty<select value={form.difficulty} onChange={(event) => onFormChange({ ...form, difficulty: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label className="text-sm">Due date<input type="date" value={form.dueDate} onChange={(event) => onFormChange({ ...form, dueDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label></div>
      <div className="mt-4"><TaskAttachments files={files} onChange={onFilesChange} /></div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="text-sm text-slate-500">Cancel</button><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save changes</button></div>
    </form>
  </div>
}
