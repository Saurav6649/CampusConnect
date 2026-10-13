import express from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notifications.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Helper to check user membership in conversation
async function checkConversationAccess(conversation, userId) {
  const userIdStr = userId.toString();

  if (conversation.type === "project") {
    if (!conversation.projectId) return false;
    const project = await Project.findById(conversation.projectId);
    if (!project) return false;
    const isMember = project.members.some((m) => m.toString() === userIdStr);
    if (isMember) {
      if (!conversation.participants.some((p) => p.toString() === userIdStr)) {
        conversation.participants.push(userId);
        await conversation.save();
      }
      return true;
    }
    return false;
  }

  return conversation.participants.some(
    (p) => (p._id || p).toString() === userIdStr
  );
}

// ── GET /api/conversations ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const userId = req.dbUser._id;

    // Also auto-ensure project conversations exist for any project user is a member of
    const userProjects = await Project.find({ members: userId }).select("_id title").lean();
    for (const proj of userProjects) {
      await Conversation.findOneAndUpdate(
        { type: "project", projectId: proj._id },
        {
          $setOnInsert: {
            type: "project",
            projectId: proj._id,
            title: proj.title,
            participants: [userId],
          },
          $addToSet: { participants: userId },
        },
        { upsert: true, new: true }
      );
    }

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name email college branch")
      .populate({
        path: "projectId",
        select: "title category status isOpen members creatorId whatsappNumber",
        populate: { path: "members", select: "name email college branch github linkedin" },
      })
      .populate("lastMessage.senderId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    // Calculate unread counts and filter out projects user was removed from
    const withUnreads = await Promise.all(
      conversations.map(async (conv) => {
        // If project conversation, verify user is still a current member
        if (conv.type === "project") {
          if (!conv.projectId) return null;
          const isStillMember = conv.projectId.members?.some(
            (m) => (m._id || m).toString() === userId.toString()
          );
          if (!isStillMember) return null;
        }

        const myLastReadObj = conv.lastRead?.find(
          (lr) => lr.userId.toString() === userId.toString()
        );
        const lastReadDate = myLastReadObj?.readAt || new Date(0);

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          createdAt: { $gt: lastReadDate },
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    res.json({ conversations: withUnreads.filter(Boolean) });
  } catch (error) {
    console.error("GET /conversations error:", error);
    res.status(500).json({ message: "Failed to load conversations" });
  }
});

// ── POST /api/conversations/direct ─────────────────────────────────────────
router.post("/direct", async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    if (recipientId.toString() === req.dbUser._id.toString()) {
      return res.status(400).json({ message: "Cannot start conversation with yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Find existing direct conversation with exact 2 participants
    let conv = await Conversation.findOne({
      type: "direct",
      participants: { $all: [req.dbUser._id, recipient._id], $size: 2 },
    })
      .populate("participants", "name email college branch")
      .lean();

    if (!conv) {
      const created = await Conversation.create({
        type: "direct",
        participants: [req.dbUser._id, recipient._id],
        title: "",
        lastRead: [
          { userId: req.dbUser._id, readAt: new Date() },
          { userId: recipient._id, readAt: new Date(0) },
        ],
      });

      conv = await Conversation.findById(created._id)
        .populate("participants", "name email college branch")
        .lean();
    }

    res.json({ conversation: conv });
  } catch (error) {
    console.error("POST /conversations/direct error:", error);
    res.status(500).json({ message: "Failed to get direct conversation" });
  }
});

// ── GET /api/conversations/project/:projectId ──────────────────────────────
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember = project.members.some(
      (m) => m.toString() === req.dbUser._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Only project members can access project chat" });
    }

    let conv = await Conversation.findOne({
      type: "project",
      projectId: project._id,
    });

    if (!conv) {
      conv = await Conversation.create({
        type: "project",
        projectId: project._id,
        title: project.title,
        participants: project.members,
      });
    } else {
      // Ensure current user is in participants list
      if (!conv.participants.some((p) => p.toString() === req.dbUser._id.toString())) {
        conv.participants.push(req.dbUser._id);
        await conv.save();
      }
    }

    const populated = await Conversation.findById(conv._id)
      .populate("participants", "name email college branch")
      .populate("projectId", "title category status isOpen")
      .lean();

    res.json({ conversation: populated });
  } catch (error) {
    console.error("GET /conversations/project/:id error:", error);
    res.status(500).json({ message: "Failed to get project conversation" });
  }
});

// ── GET /api/conversations/:id/messages ────────────────────────────────────
router.get("/:id/messages", async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const hasAccess = await checkConversationAccess(conv, req.dbUser._id);
    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have access to this conversation" });
    }

    const { limit = 50, before } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const filter = { conversationId: conv._id };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .populate("senderId", "name email college branch")
      .populate({
        path: "replyTo",
        select: "text senderId isDeleted",
        populate: { path: "senderId", select: "name" },
      })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    // Reverse so client gets chronological order
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("GET /conversations/:id/messages error:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
});

// ── POST /api/conversations/:id/messages ───────────────────────────────────
router.post("/:id/messages", async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const hasAccess = await checkConversationAccess(conv, req.dbUser._id);
    if (!hasAccess) {
      return res.status(403).json({ message: "You are not authorized to post in this conversation" });
    }

    const { text = "", attachments = [], replyTo = null } = req.body;

    if (!text.trim() && (!Array.isArray(attachments) || attachments.length === 0)) {
      return res.status(400).json({ message: "Message content or attachment required" });
    }

    // Sanitize and validate attachments
    const validatedAttachments = (Array.isArray(attachments) ? attachments : [])
      .filter((a) => a && a.url && typeof a.url === "string")
      .map((a) => ({
        name: String(a.name || "Attachment").slice(0, 100),
        url: String(a.url).trim(),
        fileType: String(a.fileType || "").slice(0, 50),
      }));

    const message = await Message.create({
      conversationId: conv._id,
      senderId: req.dbUser._id,
      text: text.trim(),
      attachments: validatedAttachments,
      replyTo: replyTo || null,
      readBy: [req.dbUser._id],
    });

    // Update conversation metadata and current user's lastRead
    conv.lastMessage = {
      text: text.trim() || (validatedAttachments.length > 0 ? "📎 Attachment" : ""),
      senderId: req.dbUser._id,
      sentAt: new Date(),
    };

    const myReadIdx = conv.lastRead.findIndex(
      (lr) => lr.userId.toString() === req.dbUser._id.toString()
    );
    if (myReadIdx >= 0) {
      conv.lastRead[myReadIdx].readAt = new Date();
    } else {
      conv.lastRead.push({ userId: req.dbUser._id, readAt: new Date() });
    }

    await conv.save();

    const populated = await Message.findById(message._id)
      .populate("senderId", "name email college branch")
      .populate({
        path: "replyTo",
        select: "text senderId isDeleted",
        populate: { path: "senderId", select: "name" },
      })
      .lean();

    // Broadcast to conversation room
    const io = getIO();
    if (io) {
      io.to(`conv_${conv._id.toString()}`).emit("new_message", populated);
    }

    // Send notifications to other participants
    for (const participantId of conv.participants) {
      if (participantId.toString() !== req.dbUser._id.toString()) {
        const notifTitle = conv.type === "project"
          ? `Message in ${conv.title || "Project Chat"}`
          : `Message from ${req.dbUser.name}`;

        await createNotification({
          recipientId: participantId,
          senderId: req.dbUser._id,
          type: "new_message",
          title: notifTitle,
          message: text.slice(0, 80) || "Sent an attachment",
          link: conv.type === "project" ? `/projects/${conv.projectId}` : `/chat`,
          projectId: conv.projectId || null,
        });
      }
    }

    res.status(201).json({ message: populated });
  } catch (error) {
    console.error("POST /conversations/:id/messages error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// ── PUT /api/conversations/messages/:messageId ─────────────────────────────
router.put("/messages/:messageId", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate("senderId", "name email college branch")
      .populate({
        path: "replyTo",
        select: "text senderId isDeleted",
        populate: { path: "senderId", select: "name" },
      })
      .lean();

    const io = getIO();
    if (io) {
      io.to(`conv_${message.conversationId.toString()}`).emit("message_edited", populated);
    }

    res.json({ message: populated });
  } catch (error) {
    console.error("PUT /messages/:id error:", error);
    res.status(500).json({ message: "Failed to edit message" });
  }
});

// ── DELETE /api/conversations/messages/:messageId ──────────────────────────
router.delete("/messages/:messageId", async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    message.isDeleted = true;
    message.text = "This message was deleted";
    message.attachments = [];
    await message.save();

    const io = getIO();
    if (io) {
      io.to(`conv_${message.conversationId.toString()}`).emit("message_deleted", {
        messageId: message._id,
      });
    }

    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error("DELETE /messages/:id error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

// ── POST /api/conversations/:id/read ───────────────────────────────────────
router.post("/:id/read", async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const userId = req.dbUser._id;
    const idx = conv.lastRead.findIndex(
      (lr) => lr.userId.toString() === userId.toString()
    );

    if (idx >= 0) {
      conv.lastRead[idx].readAt = new Date();
    } else {
      conv.lastRead.push({ userId, readAt: new Date() });
    }

    await conv.save();

    // Mark messages as read by current user
    await Message.updateMany(
      { conversationId: conv._id, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("POST /conversations/:id/read error:", error);
    res.status(500).json({ message: "Failed to mark conversation as read" });
  }
});

export default router;
