import mongoose, { Schema } from "mongoose";
const softboardNoteSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 180 },
    tasks: [
      {
        text: { type: String, required: true, trim: true },
        isCompleted: { type: Boolean, default: false },
      },
    ],
    slotIndex: { type: Number, required: true, min: 0, max: 8 },
    color: { type: String, default: "yellow" },
  },
  { timestamps: true },
);
export const SoftboardNote = mongoose.model(
  "SoftboardNote",
  softboardNoteSchema,
);
