import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    url: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["github", "docs", "figma", "demo", "api", "other"],
      default: "other",
    },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", resourceSchema);
