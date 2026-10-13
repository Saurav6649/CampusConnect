import express from "express";
import Activity from "../models/Activity.js";
import Project from "../models/Project.js";

const router = express.Router();

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
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const { limit = 50 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const activities = await Activity.find({ projectId: project._id })
      .populate("userId", "name email college branch")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.json({ activities });
  } catch (error) {
    console.error("GET /activity/project/:id error:", error);
    res.status(500).json({ message: "Failed to load project activity" });
  }
});

export default router;
