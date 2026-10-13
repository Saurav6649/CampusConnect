import mongoose from "mongoose";

const lastReadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["project", "direct"], required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    title: { type: String, default: "" },
    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: { type: Date, default: Date.now },
    },
    lastRead: [lastReadSchema],
  },
  { timestamps: true }
);

conversationSchema.index(
  { projectId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "project" } }
);

export default mongoose.model("Conversation", conversationSchema);
