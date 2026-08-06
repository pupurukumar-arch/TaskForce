import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    brief: {
      key: String,
      mimetype: String,
      size: Number,
      name: String,
    },
    // Extracted once when a brief is uploaded, so project intelligence does
    // not need to download and re-parse the private file for every question.
    briefContext: {
      text: String,
      tables: [String],
      imageInsights: String,
      sourceUpdatedAt: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const Project = mongoose.model("Project", projectSchema);
