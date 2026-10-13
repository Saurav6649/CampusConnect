import express from "express";
import Meeting from "../models/Meeting.js";
import Project from "../models/Project.js";
import { logActivity } from "../utils/activity.js";
import { createNotification } from "../utils/notifications.js";
import { getIO } from "../socket.js";

const router = express.Router();

async function getAuthorizedProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isMember = project.members.some(
    (m) => m.toString() === userId.toString()
  );
  if (!isMember) return null;
  return project;
}

// ── GET /api/meetings/project/:projectId ───────────────────────────────────
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const meetings = await Meeting.find({ projectId: project._id })
      .populate("organizerId", "name email college branch")
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.json({ meetings });
  } catch (error) {
    console.error("GET /meetings/project/:id error:", error);
    res.status(500).json({ message: "Failed to load meetings" });
  }
});

// ── POST /api/meetings/project/:projectId ──────────────────────────────────
router.post("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const {
      title,
      description = "",
      date,
      startTime,
      duration = 30,
      timeZone = "UTC",
      meetUrl,
      isManualLink = true,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Meeting title is required" });
    }

    if (!date) {
      return res.status(400).json({ message: "Meeting date is required" });
    }

    if (!startTime || !startTime.trim()) {
      return res.status(400).json({ message: "Start time is required" });
    }

    if (!meetUrl || !meetUrl.trim()) {
      return res.status(400).json({ message: "Google Meet link is required" });
    }

    const cleanUrl = meetUrl.trim();
    // Validate that it looks like a valid URL and contains meet.google.com or a valid meeting URL
    if (!/^https?:\/\/(meet\.google\.com\/[a-zA-Z0-9\-]+|.*)$/i.test(cleanUrl)) {
      return res.status(400).json({ message: "Please provide a valid Google Meet link (e.g. https://meet.google.com/abc-defg-hij)" });
    }

    const meetingDate = new Date(date);
    if (isNaN(meetingDate.getTime())) {
      return res.status(400).json({ message: "Invalid meeting date format" });
    }

    const meeting = await Meeting.create({
      projectId: project._id,
      title: title.trim(),
      description: description.trim(),
      date: meetingDate,
      startTime: startTime.trim(),
      duration: Math.min(480, Math.max(5, parseInt(duration, 10) || 30)),
      timeZone: timeZone || "UTC",
      meetUrl: cleanUrl,
      isManualLink: Boolean(isManualLink),
      organizerId: req.dbUser._id,
      status: "scheduled",
    });

    const populated = await Meeting.findById(meeting._id)
      .populate("organizerId", "name email college branch")
      .lean();

    // Log project activity
    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "project_updated",
      details: `Scheduled meeting "${meeting.title}" for ${meetingDate.toLocaleDateString()} at ${startTime}`,
    });

    // Notify all other team members
    for (const memberId of project.members) {
      if (memberId.toString() !== req.dbUser._id.toString()) {
        await createNotification({
          recipientId: memberId,
          senderId: req.dbUser._id,
          type: "project_updated",
          title: "New Team Meeting Scheduled",
          message: `${req.dbUser.name} scheduled "${meeting.title}" for ${meetingDate.toLocaleDateString()} at ${startTime}.`,
          link: `/projects/${project._id}?tab=meetings`,
          projectId: project._id,
        });
      }
    }

    // Real-time broadcast to project room
    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("meeting_scheduled", populated);
    }

    res.status(201).json({ meeting: populated });
  } catch (error) {
    console.error("POST /meetings/project/:id error:", error);
    res.status(500).json({ message: "Failed to schedule meeting" });
  }
});

// ── PUT /api/meetings/:id ──────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = project.creatorId.toString() === req.dbUser._id.toString();
    const isOrganizer = meeting.organizerId.toString() === req.dbUser._id.toString();

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({ message: "Only the meeting organizer or project owner can edit this meeting" });
    }

    const { title, description, date, startTime, duration, meetUrl, status } = req.body;

    if (title !== undefined) meeting.title = title.trim();
    if (description !== undefined) meeting.description = description.trim();
    if (date !== undefined) meeting.date = new Date(date);
    if (startTime !== undefined) meeting.startTime = startTime.trim();
    if (duration !== undefined) meeting.duration = Number(duration) || 30;
    if (meetUrl !== undefined) meeting.meetUrl = meetUrl.trim();
    if (status !== undefined && ["scheduled", "ongoing", "completed", "cancelled"].includes(status)) {
      meeting.status = status;
    }

    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate("organizerId", "name email college branch")
      .lean();

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("meeting_updated", populated);
    }

    res.json({ meeting: populated });
  } catch (error) {
    console.error("PUT /meetings/:id error:", error);
    res.status(500).json({ message: "Failed to update meeting" });
  }
});

// ── PUT /api/meetings/:id/cancel ───────────────────────────────────────────
router.put("/:id/cancel", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = project.creatorId.toString() === req.dbUser._id.toString();
    const isOrganizer = meeting.organizerId.toString() === req.dbUser._id.toString();

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({ message: "Only the organizer or owner can cancel this meeting" });
    }

    meeting.status = "cancelled";
    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate("organizerId", "name email college branch")
      .lean();

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "project_updated",
      details: `Cancelled meeting "${meeting.title}"`,
    });

    for (const memberId of project.members) {
      if (memberId.toString() !== req.dbUser._id.toString()) {
        await createNotification({
          recipientId: memberId,
          senderId: req.dbUser._id,
          type: "project_updated",
          title: "Meeting Cancelled",
          message: `The meeting "${meeting.title}" scheduled for ${meeting.date.toLocaleDateString()} was cancelled.`,
          link: `/projects/${project._id}?tab=meetings`,
          projectId: project._id,
        });
      }
    }

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("meeting_cancelled", { meetingId: meeting._id });
    }

    res.json({ meeting: populated });
  } catch (error) {
    console.error("PUT /meetings/:id/cancel error:", error);
    res.status(500).json({ message: "Failed to cancel meeting" });
  }
});

// ── DELETE /api/meetings/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const project = await Project.findById(meeting.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = project.creatorId.toString() === req.dbUser._id.toString();
    const isOrganizer = meeting.organizerId.toString() === req.dbUser._id.toString();

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({ message: "Only the organizer or owner can delete this meeting" });
    }

    const meetingId = meeting._id;
    await meeting.deleteOne();

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("meeting_deleted", { meetingId });
    }

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("DELETE /meetings/:id error:", error);
    res.status(500).json({ message: "Failed to delete meeting" });
  }
});

// ── POST /api/meetings/google-create ───────────────────────────────────────
router.post("/google-create", async (_req, res) => {
  // Check if Google Calendar API credentials are present in env
  const isConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );

  if (!isConfigured) {
    return res.json({
      supported: false,
      isConfigured: false,
      message: "Google Calendar API credentials are not configured in environment. Please provide a Google Meet link manually.",
    });
  }

  // Placeholder for when Google Calendar API credentials are provided
  return res.json({
    supported: true,
    isConfigured: true,
    message: "Google API credentials found.",
  });
});

export default router;
