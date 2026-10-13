import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: [
        "join_request_received",
        "join_request_accepted",
        "join_request_rejected",
        "member_joined",
        "member_removed",
        "task_assigned",
        "task_deadline",
        "milestone_due",
        "milestone_completed",
        "new_message",
        "mention",
        "project_updated",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
