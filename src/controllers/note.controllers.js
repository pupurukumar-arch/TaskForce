import { ProjectNote } from "../models/note.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getNotes = asyncHandler(async (req, res) => {
  const notes = await ProjectNote.find({ project: req.params.projectId })
    .populate("createdBy", "avatar username fullName")
    .sort({ updatedAt: -1 });
  return res.status(200).json(new ApiResponse(200, notes, "Project notes fetched successfully"));
});

const createNote = asyncHandler(async (req, res) => {
  const note = await ProjectNote.create({ project: req.params.projectId, createdBy: req.user._id, content: req.body.content });
  return res.status(201).json(new ApiResponse(201, note, "Project note created successfully"));
});

const getNoteById = asyncHandler(async (req, res) => {
  const note = await ProjectNote.findOne({ _id: req.params.noteId, project: req.params.projectId })
    .populate("createdBy", "avatar username fullName");
  if (!note) throw new ApiError(404, "Project note not found");
  return res.status(200).json(new ApiResponse(200, note, "Project note fetched successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await ProjectNote.findOneAndUpdate(
    { _id: req.params.noteId, project: req.params.projectId },
    { content: req.body.content },
    { new: true, runValidators: true },
  );
  if (!note) throw new ApiError(404, "Project note not found");
  return res.status(200).json(new ApiResponse(200, note, "Project note updated successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await ProjectNote.findOneAndDelete({ _id: req.params.noteId, project: req.params.projectId });
  if (!note) throw new ApiError(404, "Project note not found");
  return res.status(200).json(new ApiResponse(200, note, "Project note deleted successfully"));
});

export { createNote, deleteNote, getNoteById, getNotes, updateNote };
