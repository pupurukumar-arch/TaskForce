import { SoftboardNote } from "../models/softboard.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
const initialSlots = [0, 2, 6, 8, 4];
const initialColors = ["yellow", "blue", "green", "orange", "pink"];
const getNotes = asyncHandler(async (req, res) => {
  let notes = await SoftboardNote.find({ owner: req.user._id }).sort({
    createdAt: 1,
  });
  if (!notes.length) {
    notes = await SoftboardNote.create(
      [
        "Sprint priorities",
        "Client follow-ups",
        "Release checklist",
        "Team decisions",
        "Project pulse",
      ].map((content, index) => ({
        owner: req.user._id,
        content,
        color: initialColors[index],
        tasks: [],
        slotIndex: initialSlots[index],
      })),
    );
  } else {
    const usedSlots = new Set();
    const repairs = notes.slice(0, 9).flatMap((note, index) => {
      const valid =
        Number.isInteger(note.slotIndex) &&
        note.slotIndex >= 0 &&
        note.slotIndex <= 8 &&
        !usedSlots.has(note.slotIndex);
      const slotIndex = valid
        ? note.slotIndex
        : [
            initialSlots[index],
            ...Array.from({ length: 9 }, (_, slot) => slot),
          ].find((slot) => !usedSlots.has(slot));
      usedSlots.add(slotIndex);
      return valid
        ? []
        : [
            {
              updateOne: {
                filter: { _id: note._id },
                update: { $set: { slotIndex } },
              },
            },
          ];
    });
    if (repairs.length) await SoftboardNote.bulkWrite(repairs);
    notes = await SoftboardNote.find({ owner: req.user._id }).sort({
      createdAt: 1,
    });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, notes.slice(0, 9), "Softboard notes fetched"));
});
const createNote = asyncHandler(async (req, res) => {
  const notes = await SoftboardNote.find({ owner: req.user._id }).select(
    "slotIndex",
  );
  if (notes.length >= 9) {
    throw new ApiError(409, "The Softboard can hold a maximum of nine notes");
  }
  const usedSlots = new Set(notes.map((note) => note.slotIndex));
  const slotIndex = Array.from({ length: 9 }, (_, slot) => slot).find(
    (slot) => !usedSlots.has(slot),
  );
  if (slotIndex === undefined)
    throw new ApiError(409, "The Softboard has no free note positions");
  const note = await SoftboardNote.create({
    owner: req.user._id,
    content: "Untitled note",
    color: "yellow",
    tasks: [],
    slotIndex,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, note, "Softboard note created"));
});
const updateNote = asyncHandler(async (req, res) => {
  const { content, tasks, color, slotIndex } = req.body;
  const updates = Object.fromEntries(
    Object.entries({ content, tasks, color, slotIndex }).filter(
      ([, value]) => value !== undefined,
    ),
  );
  const note = await SoftboardNote.findOneAndUpdate(
    { _id: req.params.noteId, owner: req.user._id },
    updates,
    { new: true, runValidators: true },
  );
  if (!note) throw new ApiError(404, "Softboard note not found");
  return res
    .status(200)
    .json(new ApiResponse(200, note, "Softboard note updated"));
});
const deleteNote = asyncHandler(async (req, res) => {
  const note = await SoftboardNote.findOneAndDelete({
    _id: req.params.noteId,
    owner: req.user._id,
  });
  if (!note) throw new ApiError(404, "Softboard note not found");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Softboard note deleted"));
});
export { getNotes, createNote, updateNote, deleteNote };
