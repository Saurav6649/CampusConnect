import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "project_created",
        "project_updated",
        "member_joined",
        "member_left",
        "member_removed",
        "task_created",
        "task_updated",
        "task_completed",
        "task_deleted",
        "milestone_created",
        "milestone_completed",
        "resource_added",
        "resource_deleted",
      ],
    },
    details: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
