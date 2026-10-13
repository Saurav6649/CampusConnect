import express from "express";
import { PREDEFINED_SKILLS, PROJECT_CATEGORIES } from "../constants/skills.js";
import Project from "../models/Project.js";
import JoinRequest from "../models/JoinRequest.js";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Resource from "../models/Resource.js";
import Activity from "../models/Activity.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Meeting from "../models/Meeting.js";
import { logActivity } from "../utils/activity.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();

// ── GET /api/projects/recommendations (Skill & interest matching) ───────────
router.get("/recommendations", async (req, res) => {
  try {
    const user = req.dbUser;
    const userSkills = Array.isArray(user.skills) ? user.skills : [];
    const userInterests = Array.isArray(user.interests) ? user.interests : [];
    const preferredCategories = Array.isArray(user.preferredCategories) ? user.preferredCategories : [];

    // Find open projects where user is not creator and not a member
    const filter = {
      isOpen: true,
      deadline: { $gte: new Date() },
      creatorId: { $ne: user._id },
      members: { $ne: user._id },
    };

    const projects = await Project.find(filter)
      .populate("creatorId", "name college")
      .populate("members", "name")
      .lean();

    // Check existing join requests by this user to avoid recommending already applied
    const appliedRequests = await JoinRequest.find({
      studentId: user._id,
      status: { $in: ["pending", "accepted"] },
    }).select("projectId").lean();
    const appliedProjectIds = new Set(appliedRequests.map((r) => r.projectId.toString()));

    const recommendations = [];

    for (const proj of projects) {
      if (appliedProjectIds.has(proj._id.toString())) continue;

      const reqSkills = Array.isArray(proj.requiredSkills) ? proj.requiredSkills : [];
      const totalRequired = reqSkills.length;

      // 1. Skill overlap calculation
      let matchedSkills = [];
      let missingSkills = [];
      let skillScore = 50; // Default if project has no skill restrictions

      if (totalRequired > 0) {
        matchedSkills = reqSkills.filter((s) => userSkills.includes(s));
        missingSkills = reqSkills.filter((s) => !userSkills.includes(s));
        skillScore = Math.round((matchedSkills.length / totalRequired) * 100);
      } else {
        matchedSkills = [...userSkills];
      }

      // 2. Category & interest overlap
      let categoryMatch = false;
      if (
        preferredCategories.includes(proj.category) ||
        userInterests.some((i) => i.toLowerCase().includes(proj.category.toLowerCase()))
      ) {
        categoryMatch = true;
      }
      const categoryScore = categoryMatch ? 100 : 0;

      // 3. Team capacity score (preference for projects with open spots)
      const filled = (proj.existingMembersCount || 0) + proj.members.length;
      const spotsLeft = Math.max(0, proj.teamSize - filled);
      if (spotsLeft <= 0) continue; // Skip full projects

      // 4. Deterministic weighted score: 70% skills + 30% category/interests
      const matchScore = Math.min(
        100,
        Math.round(skillScore * 0.7 + categoryScore * 0.3)
      );

      // Generate explainable reason
      let reason = "";
      if (matchedSkills.length > 0) {
        reason = `Matches ${matchedSkills.length} required skill${
          matchedSkills.length > 1 ? "s" : ""
        } (${matchedSkills.slice(0, 3).join(", ")})${
          categoryMatch ? " and matches your preferred category." : "."
        }`;
      } else if (categoryMatch) {
        reason = `Aligns with your interest in ${proj.category}.`;
      } else {
        reason = "Open project seeking student collaborators.";
      }

      recommendations.push({
        project: proj,
        matchScore,
        matchedSkills,
        missingSkills,
        categoryMatch,
        spotsLeft,
        reason,
      });
    }

    // Sort descending by matchScore
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ recommendations: recommendations.slice(0, 15) });
  } catch (error) {
    console.error("GET /projects/recommendations error:", error);
    res.status(500).json({ message: "Failed to generate recommendations" });
  }
});

// ── Create project ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      requiredSkills,
      teamSize,
      existingMembersCount,
      deadline,
      whatsappNumber,
    } = req.body;

    if (!title || !description || !category || !teamSize || !deadline) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!PROJECT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const skills = Array.isArray(requiredSkills) ? requiredSkills : [];
    if (skills.some((s) => !PREDEFINED_SKILLS.includes(s))) {
      return res.status(400).json({ message: "Invalid required skills" });
    }

    const size = Number(teamSize);
    if (!Number.isInteger(size) || size < 2) {
      return res.status(400).json({ message: "Team size must be an integer of at least 2" });
    }

    const existing = Math.max(0, parseInt(existingMembersCount, 10) || 0);
    if (existing >= size) {
      return res.status(400).json({ message: "Existing member count must be less than team size" });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return res.status(400).json({ message: "Deadline must be a valid future date" });
    }

    if (whatsappNumber && !/^[+\d\s\-().]{7,20}$/.test(String(whatsappNumber).trim())) {
      return res.status(400).json({ message: "Invalid WhatsApp number format" });
    }

    const totalFilled = existing + 1;

    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      category,
      requiredSkills: skills,
      whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : "",
      creatorId: req.dbUser._id,
      members: [req.dbUser._id],
      teamSize: size,
      existingMembersCount: existing,
      isOpen: totalFilled < size,
      status: "active",
      startDate: new Date(),
      deadline: deadlineDate,
    });

    // Create project chat conversation
    await Conversation.create({
      type: "project",
      projectId: project._id,
      title: project.title,
      participants: [req.dbUser._id],
    });

    // Log activity
    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "project_created",
      details: `Project "${project.title}" created`,
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error("create project:", error);
    res.status(500).json({ message: "Failed to create project" });
  }
});

// ── List projects (with search, category filter, deadline filter, pagination) ─
router.get("/", async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const filter = { isOpen: true, deadline: { $gte: new Date() } };

    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: "i" } },
        { description: { $regex: String(q), $options: "i" } },
      ];
    }
    if (category && category !== "All") {
      filter.category = category;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("creatorId", "name college")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Project.countDocuments(filter),
    ]);

    res.json({
      projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("list projects:", error);
    res.status(500).json({ message: "Failed to load projects" });
  }
});

// ── Get project workspace (consolidated data for workspace tabs) ───────────
router.get("/:id/workspace", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("creatorId", "name email college branch skills github linkedin")
      .populate("members", "name email college branch skills github linkedin")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const userId = req.dbUser._id.toString();
    const isOwner = (project.creatorId?._id || project.creatorId).toString() === userId;
    const isMember = project.members.some(
      (m) => (m._id || m).toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ message: "Only team members can access the workspace" });
    }

    // Load tasks summary, milestones, resources, activities, meetings, join requests if owner
    const [tasks, milestones, resources, activities, meetings, pendingRequests] = await Promise.all([
      Task.find({ projectId: project._id })
        .populate("assigneeId", "name")
        .sort({ order: 1, createdAt: -1 })
        .lean(),
      Milestone.find({ projectId: project._id })
        .populate("responsibleMemberId", "name")
        .sort({ dueDate: 1 })
        .lean(),
      Resource.find({ projectId: project._id })
        .populate("uploadedById", "name")
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
      Activity.find({ projectId: project._id })
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Meeting.find({ projectId: project._id })
        .populate("organizerId", "name")
        .sort({ date: 1, startTime: 1 })
        .lean(),
      isOwner
        ? JoinRequest.find({ projectId: project._id, status: "pending" })
            .populate("studentId", "name email college branch skills")
            .lean()
        : [],
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const progressPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    res.json({
      project,
      isOwner,
      isMember,
      tasks,
      milestones,
      resources,
      activities,
      meetings,
      pendingRequests,
      stats: {
        totalTasks,
        completedTasks,
        progressPercentage,
        totalMilestones: milestones.length,
        completedMilestones: milestones.filter((m) => m.status === "completed").length,
      },
    });
  } catch (error) {
    console.error("get project workspace:", error);
    res.status(500).json({ message: "Failed to load project workspace" });
  }
});

// ── Get project by id ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("creatorId", "name email college branch skills github linkedin")
      .populate("members", "name email college branch skills github linkedin")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember = project.members.some(
      (m) => (m._id || m).toString() === req.dbUser._id.toString()
    );
    if (!isMember) {
      delete project.whatsappNumber;
    }

    const existingRequest = await JoinRequest.findOne({
      projectId: project._id,
      studentId: req.dbUser._id,
    }).lean();

    res.json({
      project,
      joinRequest: existingRequest,
    });
  } catch (error) {
    console.error("get project:", error);
    res.status(500).json({ message: "Failed to load project" });
  }
});

// ── Edit project (owner only) ──────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.creatorId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "Only the owner can edit this project" });
    }

    const {
      title,
      description,
      category,
      requiredSkills,
      teamSize,
      existingMembersCount,
      deadline,
      whatsappNumber,
      isOpen,
      status,
    } = req.body;

    if (category && !PROJECT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    if (requiredSkills) {
      const skills = Array.isArray(requiredSkills) ? requiredSkills : [];
      if (skills.some((s) => !PREDEFINED_SKILLS.includes(s))) {
        return res.status(400).json({ message: "Invalid required skills" });
      }
      project.requiredSkills = skills;
    }

    if (teamSize !== undefined) {
      const size = Number(teamSize);
      if (!Number.isInteger(size) || size < 2) {
        return res.status(400).json({ message: "Team size must be an integer of at least 2" });
      }
      if (size < project.members.length) {
        return res.status(400).json({
          message: `Team size cannot be less than current member count (${project.members.length})`,
        });
      }
      project.teamSize = size;
    }

    if (existingMembersCount !== undefined) {
      const existing = Math.max(0, parseInt(existingMembersCount, 10) || 0);
      const totalFilled = existing + project.members.length;
      if (totalFilled > project.teamSize) {
        return res.status(400).json({
          message: `Existing offline members + platform members (${totalFilled}) exceeds team size (${project.teamSize})`,
        });
      }
      project.existingMembersCount = existing;
    }

    if (deadline !== undefined) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ message: "Invalid deadline date" });
      }
      project.deadline = deadlineDate;
    }

    if (whatsappNumber !== undefined) {
      const num = String(whatsappNumber).trim();
      if (num && !/^[+\d\s\-().]{7,20}$/.test(num)) {
        return res.status(400).json({ message: "Invalid WhatsApp number format" });
      }
      project.whatsappNumber = num;
    }

    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (status !== undefined && ["planning", "active", "completed", "paused"].includes(status)) {
      project.status = status;
    }

    if (isOpen !== undefined) {
      const totalFilled = (project.existingMembersCount || 0) + project.members.length;
      if (isOpen && totalFilled >= project.teamSize) {
        return res.status(400).json({ message: "Cannot reopen a full team. Increase team size first." });
      }
      project.isOpen = Boolean(isOpen);
    }

    // Auto-recalculate isOpen based on total filled vs teamSize
    if (teamSize !== undefined || existingMembersCount !== undefined) {
      const totalFilled = (project.existingMembersCount || 0) + project.members.length;
      project.isOpen = totalFilled < project.teamSize;
    }

    await project.save();

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "project_updated",
      details: "Updated project details",
    });

    const populated = await Project.findById(project._id)
      .populate("creatorId", "name email college branch skills github linkedin")
      .populate("members", "name email college branch skills")
      .lean();

    res.json({ project: populated });
  } catch (error) {
    console.error("edit project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
});

// ── Transfer Ownership (owner only) ────────────────────────────────────────
router.post("/:id/transfer-ownership", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.creatorId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "Only the owner can transfer ownership" });
    }

    const { newOwnerId } = req.body;
    if (!newOwnerId) {
      return res.status(400).json({ message: "New owner ID required" });
    }

    if (!project.members.map(String).includes(newOwnerId.toString())) {
      return res.status(400).json({ message: "New owner must be an existing team member" });
    }

    project.creatorId = newOwnerId;
    await project.save();

    const newOwner = await User.findById(newOwnerId);

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "project_updated",
      details: `Transferred ownership to ${newOwner?.name || "a member"}`,
    });

    await createNotification({
      recipientId: newOwnerId,
      senderId: req.dbUser._id,
      type: "project_updated",
      title: "Project Ownership Transferred",
      message: `${req.dbUser.name} transferred ownership of "${project.title}" to you.`,
      link: `/projects/${project._id}`,
      projectId: project._id,
    });

    res.json({ message: "Ownership transferred successfully", project });
  } catch (error) {
    console.error("transfer ownership:", error);
    res.status(500).json({ message: "Failed to transfer ownership" });
  }
});

// ── Remove Member (owner only) ─────────────────────────────────────────────
router.delete("/:id/members/:memberId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.creatorId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "Only the owner can remove members" });
    }

    const memberId = req.params.memberId;
    if (project.creatorId.toString() === memberId) {
      return res.status(400).json({ message: "Cannot remove project owner. Transfer ownership first." });
    }

    if (!project.members.map(String).includes(memberId)) {
      return res.status(400).json({ message: "User is not a member of this project" });
    }

    project.members = project.members.filter((m) => m.toString() !== memberId);

    // Reopen project if spots freed
    const totalFilled = (project.existingMembersCount || 0) + project.members.length;
    if (totalFilled < project.teamSize) {
      project.isOpen = true;
    }

    await project.save();

    // Also remove from project conversation
    await Conversation.updateOne(
      { type: "project", projectId: project._id },
      { $pull: { participants: memberId } }
    );

    // Update join request status
    await JoinRequest.updateOne(
      { projectId: project._id, studentId: memberId },
      { status: "rejected" }
    );

    const removedUser = await User.findById(memberId);

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "member_removed",
      details: `Removed ${removedUser?.name || "a member"} from the team`,
    });

    await createNotification({
      recipientId: memberId,
      senderId: req.dbUser._id,
      type: "member_removed",
      title: "Removed from Project",
      message: `You were removed from "${project.title}" by the owner.`,
      link: `/projects/${project._id}`,
      projectId: project._id,
    });

    res.json({ message: "Member removed successfully", project });
  } catch (error) {
    console.error("remove member:", error);
    res.status(500).json({ message: "Failed to remove member" });
  }
});

// ── Join project ───────────────────────────────────────────────────────────
router.post("/:id/join", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!project.isOpen) {
      return res.status(400).json({ message: "This project is no longer accepting members" });
    }

    if (project.deadline < new Date()) {
      return res.status(400).json({ message: "This project's deadline has passed" });
    }

    const userId = req.dbUser._id.toString();
    if (project.members.map(String).includes(userId)) {
      return res.status(400).json({ message: "You are already a member" });
    }

    const existing = await JoinRequest.findOne({
      projectId: project._id,
      studentId: req.dbUser._id,
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ message: "Request already pending" });
      }
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "You are already accepted" });
      }
      existing.status = "pending";
      await existing.save();

      // Notify owner
      await createNotification({
        recipientId: project.creatorId,
        senderId: req.dbUser._id,
        type: "join_request_received",
        title: "Join Request Received",
        message: `${req.dbUser.name} requested to join "${project.title}"`,
        link: `/projects/${project._id}/requests`,
        projectId: project._id,
      });

      return res.status(201).json({ joinRequest: existing });
    }

    const joinRequest = await JoinRequest.create({
      projectId: project._id,
      studentId: req.dbUser._id,
      status: "pending",
    });

    // Notify owner
    await createNotification({
      recipientId: project.creatorId,
      senderId: req.dbUser._id,
      type: "join_request_received",
      title: "Join Request Received",
      message: `${req.dbUser.name} requested to join "${project.title}"`,
      link: `/projects/${project._id}/requests`,
      projectId: project._id,
    });

    res.status(201).json({ joinRequest });
  } catch (error) {
    console.error("join project:", error);
    res.status(500).json({ message: "Failed to send join request" });
  }
});

// ── Leave project (member only, not owner) ─────────────────────────────────
router.delete("/:id/members/me", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const userId = req.dbUser._id.toString();

    if (project.creatorId.toString() === userId) {
      return res.status(400).json({
        message: "Project owner cannot leave. Transfer ownership or delete the project instead.",
      });
    }

    if (!project.members.map(String).includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this project" });
    }

    project.members = project.members.filter((m) => m.toString() !== userId);

    const totalFilled = (project.existingMembersCount || 0) + project.members.length;
    if (totalFilled < project.teamSize) {
      project.isOpen = true;
    }

    await project.save();

    await JoinRequest.updateOne(
      { projectId: project._id, studentId: req.dbUser._id },
      { status: "rejected" }
    );

    // Remove from project conversation
    await Conversation.updateOne(
      { type: "project", projectId: project._id },
      { $pull: { participants: req.dbUser._id } }
    );

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "member_left",
      details: `${req.dbUser.name} left the project`,
    });

    await createNotification({
      recipientId: project.creatorId,
      senderId: req.dbUser._id,
      type: "member_removed",
      title: "Member Left Team",
      message: `${req.dbUser.name} left "${project.title}".`,
      link: `/projects/${project._id}`,
      projectId: project._id,
    });

    res.json({ message: "You have left the project" });
  } catch (error) {
    console.error("leave project:", error);
    res.status(500).json({ message: "Failed to leave project" });
  }
});

// ── Get join requests (owner only) ─────────────────────────────────────────
router.get("/:id/requests", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.creatorId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "Only the owner can view join requests" });
    }

    const requests = await JoinRequest.find({ projectId: project._id })
      .populate("studentId", "name email college branch year bio skills github linkedin")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ project, requests });
  } catch (error) {
    console.error("get requests:", error);
    res.status(500).json({ message: "Failed to load join requests" });
  }
});

// ── Delete project (owner only, cascades all related data) ─────────────────
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.creatorId.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: "Only the owner can delete this project" });
    }

    const projectId = project._id;

    // Cascade delete: requests, tasks, milestones, resources, activities, meetings, conversation & messages
    await Promise.all([
      JoinRequest.deleteMany({ projectId }),
      Task.deleteMany({ projectId }),
      Milestone.deleteMany({ projectId }),
      Resource.deleteMany({ projectId }),
      Activity.deleteMany({ projectId }),
      Meeting.deleteMany({ projectId }),
    ]);

    const conv = await Conversation.findOne({ type: "project", projectId });
    if (conv) {
      await Message.deleteMany({ conversationId: conv._id });
      await conv.deleteOne();
    }

    await project.deleteOne();

    res.json({ message: "Project and all associated data deleted successfully" });
  } catch (error) {
    console.error("delete project:", error);
    res.status(500).json({ message: "Failed to delete project" });
  }
});

export default router;
