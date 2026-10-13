import Notification from "../models/Notification.js";
import { getIO } from "../socket.js";

export async function createNotification({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  link = "",
  projectId = null,
}) {
  try {
    // Prevent notifying yourself
    if (senderId && recipientId.toString() === senderId.toString()) {
      return null;
    }

    const notif = await Notification.create({
      recipientId,
      senderId,
      type,
      title,
      message,
      link,
      projectId,
    });

    const populated = await Notification.findById(notif._id)
      .populate("senderId", "name email college")
      .populate("projectId", "title")
      .lean();

    const io = getIO();
    if (io) {
      io.to(`user_${recipientId.toString()}`).emit("new_notification", populated);
    }

    return populated;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
