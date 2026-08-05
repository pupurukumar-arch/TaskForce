import { useEffect, useRef, useState } from "react";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";
const slots = [
  [7, 8],
  [36, 8],
  [65, 8],
  [7, 40],
  [36, 40],
  [65, 40],
  [7, 72],
  [36, 72],
  [65, 72],
];
const rotations = [-2.2, 1.6, -0.9, 2.4];
const noteColors = ["yellow", "pink", "blue", "green", "orange"];
export function SoftboardPage({ user }) {
  const [notes, setNotes] = useState([]);
  const [active, setActive] = useState(null);
  const [task, setTask] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const boardRef = useRef(null);
  const hoveredSlotRef = useRef(null);
  const slotSaveQueueRef = useRef(Promise.resolve());
  const load = () => api("/softboard").then(setNotes);
  useEffect(() => {
    load();
  }, []);
  const save = (note, tasks) =>
    api(`/softboard/${note._id}`, {
      method: "PUT",
      body: JSON.stringify({ tasks }),
    }).then(load);
  const updateTasks = (tasks) => {
    const next = { ...active, tasks };
    setActive(next);
    save(next, tasks);
  };
  const add = (e) => {
    e.preventDefault();
    if (!task.trim()) return;
    updateTasks([
      ...(active.tasks || []),
      { text: task.trim(), isCompleted: false },
    ]);
    setTask("");
  };
  const nearestFreeSlot = (event, noteId) => {
    const board = boardRef.current;
    if (!board) return null;
    const bounds = board.getBoundingClientRect();
    const occupied = new Set(
      notes.filter((note) => note._id !== noteId).map((note) => note.slotIndex),
    );
    return (
      slots
        .map(([x, y], index) => ({
          index,
          distance: Math.hypot(
            event.clientX - (bounds.left + (x / 100) * bounds.width),
            event.clientY - (bounds.top + (y / 100) * bounds.height),
          ),
          occupied: occupied.has(index),
        }))
        .filter((slot) => !slot.occupied)
        .sort((a, b) => a.distance - b.distance)[0]?.index ?? null
    );
  };
  const previewSlot = (event) => {
    event.preventDefault();
    const slotIndex = nearestFreeSlot(event, draggingId);
    if (slotIndex !== hoveredSlotRef.current) {
      hoveredSlotRef.current = slotIndex;
      setHoveredSlot(slotIndex);
    }
  };
  const placeAtSlot = (event) => {
    event.preventDefault();
    const slotIndex =
      hoveredSlotRef.current ?? nearestFreeSlot(event, draggingId);
    if (slotIndex === null || !draggingId) return;
    const noteId = draggingId;
    setNotes((current) =>
      current.map((note) =>
        note._id === noteId ? { ...note, slotIndex } : note,
      ),
    );
    slotSaveQueueRef.current = slotSaveQueueRef.current
      .catch(() => {})
      .then(() =>
        api(`/softboard/${noteId}`, {
          method: "PUT",
          body: JSON.stringify({ slotIndex }),
        }),
      )
      .catch(() => load());
    hoveredSlotRef.current = null;
    setHoveredSlot(null);
  };
  const changeColor = (color) => {
    const next = { ...active, color };
    setActive(next);
    api(`/softboard/${active._id}`, {
      method: "PUT",
      body: JSON.stringify({ color }),
    }).then(load);
  };
  const addNote = async () => {
    try {
      const note = await api("/softboard", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotes((current) => [...current, note]);
      setActive(note);
    } catch (error) {
      window.alert(error.message || "No free Softboard positions remain.");
    }
  };
  const deleteDraggedNote = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingId) return;
    await api(`/softboard/${draggingId}`, { method: "DELETE" });
    setNotes((current) => current.filter((note) => note._id !== draggingId));
    if (active?._id === draggingId) setActive(null);
    setDraggingId(null);
    hoveredSlotRef.current = null;
    setHoveredSlot(null);
  };
  return (
    <AppLayout user={user} hideHeader defaultNightTheme>
      <section className="softboard-shell">
        <div className="softboard-actions">
          <button type="button" onClick={addNote} disabled={notes.length >= 9}>
            + Add note
          </button>
        </div>
        <section
          ref={boardRef}
          onDragOver={previewSlot}
          onDrop={placeAtSlot}
          className={`softboard softboard-real min-h-[650px] rounded-xl ${active ? "paused" : ""} ${draggingId ? "is-dragging" : ""}`}
        >
          {slots.map(([left, top], index) => (
            <span
              key={index}
              className={`softboard-hook ${hoveredSlot === index ? "is-target" : ""}`}
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          ))}
          {notes.map((note, index) => (
            <button
              key={note._id}
              onClick={() => setActive(note)}
              onDragStart={() => setDraggingId(note._id)}
              onDragEnd={() => {
                setDraggingId(null);
                hoveredSlotRef.current = null;
                setHoveredSlot(null);
              }}
              draggable
              className={`sticky sticky-${note.color || "yellow"} sticky-real sticky-draggable`}
              style={{
                left: `${slots[note.slotIndex ?? index]?.[0] ?? slots[index][0]}%`,
                top: `${slots[note.slotIndex ?? index]?.[1] ?? slots[index][1]}%`,
                "--note-rotation": `${rotations[index] ?? 0}deg`,
                "--note-index": index,
              }}
            >
              <span className="sticky-pin" />
              {note.content}
              <small>
                {note.tasks?.filter((t) => !t.isCompleted).length || 0} tasks
              </small>
            </button>
          ))}
        </section>
        <div
          className={`softboard-bin ${draggingId ? "is-ready" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={deleteDraggedNote}
        >
          <span aria-hidden="true">🗑</span> Drop here to delete
        </div>
      </section>
      {active && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-blue-950/88 p-5"
          onClick={() => setActive(null)}
        >
          <article
            className={`sticky sticky-${active.color || "yellow"} sticky-focus sticky-real`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sticky-pin" />
            <input
              value={active.content}
              onChange={(e) =>
                setActive({ ...active, content: e.target.value })
              }
              onBlur={() =>
                api(`/softboard/${active._id}`, {
                  method: "PUT",
                  body: JSON.stringify({ content: active.content }),
                }).then(load)
              }
              className="w-full bg-transparent text-xl font-semibold outline-none"
            />
            <div className="sticky-colors" aria-label="Change note color">
              {noteColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`${color} paper`}
                  className={`sticky-color sticky-color-${color} ${active.color === color ? "is-selected" : ""}`}
                  onClick={() => changeColor(color)}
                />
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {(active.tasks || []).map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() =>
                      updateTasks(
                        active.tasks.map((t, j) =>
                          j === i ? { ...t, isCompleted: !t.isCompleted } : t,
                        ),
                      )
                    }
                  />
                  <input
                    value={item.text}
                    onChange={(e) => {
                      const tasks = active.tasks.map((t, j) =>
                        j === i ? { ...t, text: e.target.value } : t,
                      );
                      setActive({ ...active, tasks });
                    }}
                    onBlur={() => save(active, active.tasks)}
                    className={`min-w-0 flex-1 bg-transparent outline-none ${item.isCompleted ? "line-through" : ""}`}
                  />
                  <button
                    onClick={() =>
                      updateTasks(active.tasks.filter((_, j) => j !== i))
                    }
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={add} className="mt-5 flex gap-2">
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Add a to-do"
                className="min-w-0 flex-1 border-b border-amber-500 bg-transparent p-2 outline-none"
              />
              <button>+</button>
            </form>
          </article>
        </div>
      )}
    </AppLayout>
  );
}
