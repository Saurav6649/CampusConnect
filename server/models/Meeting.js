import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 30,
      min: 5,
      max: 480,
    },
    timeZone: {
      type: String,
      default: "UTC",
    },
    meetUrl: {
      type: String,
      required: true,
      trim: true,
    },
    isManualLink: {
      type: Boolean,
      default: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },
    googleEventId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);
