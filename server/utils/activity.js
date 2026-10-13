import Activity from "../models/Activity.js";
import { getIO } from "../socket.js";

export async function logActivity({ projectId, userId, action, details = "" }) {
  try {
    const act = await Activity.create({
      projectId,
      userId,
      action,
      details,
    });

    const populated = await Activity.findById(act._id)
      .populate("userId", "name email college")
      .lean();

    const io = getIO();
    if (io) {
      io.to(`project_${projectId.toString()}`).emit("new_activity", populated);
    }

    return populated;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
}
