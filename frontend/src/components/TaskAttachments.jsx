const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 1 * 1000 * 1000;

const formatFileSize = (size) => {
  if (size < 1000 * 1000) return `${Math.ceil(size / 1000)} KB`;
  return `${(size / (1000 * 1000)).toFixed(1)} MB`;
};

export function TaskAttachments({ files = [], onChange, onError, disabled = false }) {
  const selectFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.some((file) => file.size > MAX_FILE_SIZE)) {
      onChange([]);
      onError?.("Each attachment must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }
    onError?.("");
    onChange(selectedFiles.slice(0, MAX_ATTACHMENTS));
  };

  const removeFile = (index) => {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <section>
      <label
        className="block text-sm font-medium text-slate-700"
        htmlFor="task-attachments"
      >
        Attachments{" "}
        <span className="font-normal text-slate-500">
          (up to {MAX_ATTACHMENTS})
        </span>
      </label>
      <input
        id="task-attachments"
        name="attachments"
        type="file"
        multiple
        disabled={disabled}
        accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,text/plain,application/pdf,image/jpeg,image/png,image/webp"
        onChange={selectFiles}
        className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
      />
      <p className="mt-1 text-xs text-slate-500">
        PDF, TXT, JPEG, PNG, or WEBP files up to 1 MB each.
      </p>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Selected attachments">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700">
                {file.name}{" "}
                <span className="text-slate-400">
                  ({formatFileSize(file.size)})
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeFile(index)}
                className="shrink-0 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
