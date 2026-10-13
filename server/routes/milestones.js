import express from "express";
import Milestone from "../models/Milestone.js";
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

// ── GET /api/milestones/project/:projectId ─────────────────────────────────
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const milestones = await Milestone.find({ projectId: project._id })
      .populate("responsibleMemberId", "name email")
      .sort({ dueDate: 1, createdAt: 1 })
      .lean();

    res.json({ milestones });
  } catch (error) {
    console.error("GET /milestones/project/:id error:", error);
    res.status(500).json({ message: "Failed to load milestones" });
  }
});

// ── POST /api/milestones/project/:projectId ────────────────────────────────
router.post("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const { title, description = "", dueDate, responsibleMemberId = null } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Milestone title is required" });
    }
    if (!dueDate) {
      return res.status(400).json({ message: "Due date is required" });
    }

    const due = new Date(dueDate);
    if (isNaN(due.getTime())) {
      return res.status(400).json({ message: "Invalid due date" });
    }

    if (responsibleMemberId) {
      const isMember = project.members.some(
        (m) => m.toString() === responsibleMemberId.toString()
      );
      if (!isMember) {
        return res.status(400).json({ message: "Responsible member must belong to the project" });
      }
    }

    const milestone = await Milestone.create({
      projectId: project._id,
      title: title.trim(),
      description: description.trim(),
      dueDate: due,
      responsibleMemberId: responsibleMemberId || null,
      status: "pending",
    });

    const populated = await Milestone.findById(milestone._id)
      .populate("responsibleMemberId", "name email")
      .lean();

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "milestone_created",
      details: `Created milestone "${milestone.title}"`,
    });

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("milestone_created", populated);
    }

    res.status(201).json({ milestone: populated });
  } catch (error) {
    console.error("POST /milestones/project/:id error:", error);
    res.status(500).json({ message: "Failed to create milestone" });
  }
});

// ── PUT /api/milestones/:id ────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const project = await getAuthorizedProject(milestone.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not authorized to update this milestone" });
    }

    const { title, description, dueDate, status, responsibleMemberId } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
      milestone.title = title.trim();
    }
    if (description !== undefined) milestone.description = description.trim();
    if (dueDate !== undefined) {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) return res.status(400).json({ message: "Invalid due date" });
      milestone.dueDate = due;
    }
    if (status !== undefined) {
      if (!["pending", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      milestone.status = status;
      if (status === "completed" && !milestone.completedAt) {
        milestone.completedAt = new Date();
      } else if (status !== "completed") {
        milestone.completedAt = null;
      }
    }
    if (responsibleMemberId !== undefined) {
      if (responsibleMemberId) {
        const isMember = project.members.some(
          (m) => m.toString() === responsibleMemberId.toString()
        );
        if (!isMember) {
          return res.status(400).json({ message: "Responsible member must belong to the project" });
        }
        milestone.responsibleMemberId = responsibleMemberId;
      } else {
        milestone.responsibleMemberId = null;
      }
    }

    await milestone.save();

    const populated = await Milestone.findById(milestone._id)
      .populate("responsibleMemberId", "name email")
      .lean();

    if (status === "completed") {
      await logActivity({
        projectId: project._id,
        userId: req.dbUser._id,
        action: "milestone_completed",
        details: `Completed milestone "${milestone.title}"`,
      });

      // Notify project owner if someone else completed it
      if (project.creatorId.toString() !== req.dbUser._id.toString()) {
        await createNotification({
          recipientId: project.creatorId,
          senderId: req.dbUser._id,
          type: "milestone_completed",
          title: "Milestone Completed",
          message: `${req.dbUser.name} completed milestone "${milestone.title}" in ${project.title}`,
          link: `/projects/${project._id}`,
          projectId: project._id,
        });
      }
    }

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("milestone_updated", populated);
    }

    res.json({ milestone: populated });
  } catch (error) {
    console.error("PUT /milestones/:id error:", error);
    res.status(500).json({ message: "Failed to update milestone" });
  }
});

// ── DELETE /api/milestones/:id ─────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const project = await Project.findById(milestone.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = project.creatorId.toString() === req.dbUser._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: "Only the project owner can delete milestones" });
    }

    const milestoneId = milestone._id;
    await milestone.deleteOne();

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("milestone_deleted", { milestoneId });
    }

    res.json({ message: "Milestone deleted successfully" });
  } catch (error) {
    console.error("DELETE /milestones/:id error:", error);
    res.status(500).json({ message: "Failed to delete milestone" });
  }
});

export default router;
