import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: true }
);

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["backlog", "todo", "in_progress", "in_review", "completed"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null, index: true },
    labels: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    comments: [commentSchema],
    attachments: [attachmentSchema],
    activity: [activitySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
