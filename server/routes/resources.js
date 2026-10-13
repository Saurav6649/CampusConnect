import express from "express";
import Resource from "../models/Resource.js";
import Project from "../models/Project.js";
import { logActivity } from "../utils/activity.js";
import { getIO } from "../socket.js";

const router = express.Router();

const VALID_TYPES = ["github", "docs", "figma", "demo", "api", "other"];

async function getAuthorizedProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isMember = project.members.some(
    (m) => m.toString() === userId.toString()
  );
  if (!isMember) return null;
  return project;
}

// ── GET /api/resources/project/:projectId ──────────────────────────────────
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const resources = await Resource.find({ projectId: project._id })
      .populate("uploadedById", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ resources });
  } catch (error) {
    console.error("GET /resources/project/:id error:", error);
    res.status(500).json({ message: "Failed to load resources" });
  }
});

// ── POST /api/resources/project/:projectId ─────────────────────────────────
router.post("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const { title, description = "", url, type = "other" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Resource title is required" });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ message: "Resource URL is required" });
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      return res.status(400).json({ message: "Invalid resource URL format" });
    }

    const resourceType = VALID_TYPES.includes(type) ? type : "other";

    const resource = await Resource.create({
      projectId: project._id,
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      type: resourceType,
      uploadedById: req.dbUser._id,
    });

    const populated = await Resource.findById(resource._id)
      .populate("uploadedById", "name email")
      .lean();

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "resource_added",
      details: `Added resource "${resource.title}" (${resourceType})`,
    });

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("resource_added", populated);
    }

    res.status(201).json({ resource: populated });
  } catch (error) {
    console.error("POST /resources/project/:id error:", error);
    res.status(500).json({ message: "Failed to add resource" });
  }
});

// ── DELETE /api/resources/:id ──────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const project = await Project.findById(resource.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = project.creatorId.toString() === req.dbUser._id.toString();
    const isUploader = resource.uploadedById.toString() === req.dbUser._id.toString();

    if (!isOwner && !isUploader) {
      return res.status(403).json({ message: "Only the uploader or project owner can delete this resource" });
    }

    const resourceId = resource._id;
    const resourceTitle = resource.title;
    await resource.deleteOne();

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "resource_deleted",
      details: `Deleted resource "${resourceTitle}"`,
    });

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("resource_deleted", { resourceId });
    }

    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("DELETE /resources/:id error:", error);
    res.status(500).json({ message: "Failed to delete resource" });
  }
});

export default router;
