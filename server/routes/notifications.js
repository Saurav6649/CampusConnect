import express from "express";
import Notification from "../models/Notification.js";

const router = express.Router();

// ── GET /api/notifications ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { limit = 40, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipientId: req.dbUser._id })
        .populate("senderId", "name email college branch")
        .populate("projectId", "title category status isOpen")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments({ recipientId: req.dbUser._id }),
      Notification.countDocuments({ recipientId: req.dbUser._id, read: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("GET /notifications error:", error);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

// ── PUT /api/notifications/:id/read ────────────────────────────────────────
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.dbUser._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ notification });
  } catch (error) {
    console.error("PUT /notifications/:id/read error:", error);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// ── PUT /api/notifications/read-all ────────────────────────────────────────
router.put("/read-all", async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.dbUser._id, read: false },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("PUT /notifications/read-all error:", error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// ── DELETE /api/notifications/:id ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.dbUser._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("DELETE /notifications/:id error:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;
