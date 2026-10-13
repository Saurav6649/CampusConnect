import express from "express";
import { PREDEFINED_SKILLS } from "../constants/skills.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import JoinRequest from "../models/JoinRequest.js";
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// ── Search users for starting Direct Messages or Invitations ────────────────
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({ users: [] });
    }

    const searchRegex = new RegExp(String(q).trim(), "i");
    const users = await User.find({
      _id: { $ne: req.dbUser._id },
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { college: searchRegex },
        { skills: searchRegex },
      ],
    })
      .select("name email college branch skills experienceLevel")
      .limit(20)
      .lean();

    res.json({ users });
  } catch (err) {
    console.error("GET /api/users/search error:", err);
    res.status(500).json({ message: "Failed to search users" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const [createdCount, membershipCount, assignedTaskCount, unreadNotifCount] = await Promise.all([
      Project.countDocuments({ creatorId: req.dbUser._id }),
      Project.countDocuments({ members: req.dbUser._id }),
      Task.countDocuments({ assigneeId: req.dbUser._id, status: { $ne: "completed" } }),
      Notification.countDocuments({ recipientId: req.dbUser._id, read: false }),
    ]);

    res.json({
      user: req.dbUser,
      metrics: {
        projectsCreated: createdCount,
        activeMemberships: membershipCount,
        openTasks: assignedTaskCount,
        unreadNotifications: unreadNotifCount,
      },
    });
  } catch (err) {
    console.error("GET /api/users/me error:", err);
    res.status(500).json({ message: "Failed to load user info" });
  }
});

router.get("/me/notifications", async (req, res) => {
  try {
    const userId = req.dbUser._id;

    // Get all projects owned by this user
    const ownedProjects = await Project.find({ creatorId: userId }).select("_id title").lean();
    const projectIds = ownedProjects.map((p) => p._id);

    // Get all pending join requests for those projects
    const pendingRequests = projectIds.length
      ? await JoinRequest.find({
          projectId: { $in: projectIds },
          status: "pending",
        })
          .populate("studentId", "name email college branch year skills")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const projectMap = {};
    ownedProjects.forEach((p) => {
      projectMap[p._id.toString()] = p.title;
    });

    const notifications = pendingRequests.map((reqItem) => ({
      ...reqItem,
      projectTitle: projectMap[reqItem.projectId.toString()] || "Unknown project",
    }));

    // Also get general unread notifications count
    const systemUnreadCount = await Notification.countDocuments({
      recipientId: userId,
      read: false,
    });

    res.json({
      notifications,
      count: notifications.length,
      systemUnreadCount,
    });
  } catch (err) {
    console.error("GET /api/users/me/notifications error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

router.get("/me/dashboard", async (req, res) => {
  try {
    const userId = req.dbUser._id;
    const now = new Date();

    const [createdProjects, applications, createdCount, membershipCount, myTasks, unreadNotifCount] =
      await Promise.all([
        Project.find({ creatorId: userId }).sort({ createdAt: -1 }).lean(),
        JoinRequest.find({ studentId: userId })
          .populate("projectId", "title isOpen category deadline")
          .sort({ createdAt: -1 })
          .lean(),
        Project.countDocuments({ creatorId: userId }),
        Project.countDocuments({ members: userId }),
        Task.find({ assigneeId: userId })
          .populate("projectId", "title category")
          .sort({ dueDate: 1 })
          .lean(),
        Notification.countDocuments({ recipientId: userId, read: false }),
      ]);

    const projectIds = (createdProjects || []).map((p) => p._id);
    const pendingCounts = projectIds.length
      ? await JoinRequest.aggregate([
          { $match: { projectId: { $in: projectIds }, status: "pending" } },
          { $group: { _id: "$projectId", count: { $sum: 1 } } },
        ])
      : [];

    const pendingCountMap = {};
    pendingCounts.forEach(({ _id, count }) => {
      pendingCountMap[_id.toString()] = count;
    });

    const totalTasksAssigned = myTasks.length;
    const tasksCompleted = myTasks.filter((t) => t.status === "completed").length;
    const tasksOverdue = myTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
    ).length;

    res.json({
      user: req.dbUser,
      metrics: {
        projectsCreated: createdCount,
        activeMemberships: membershipCount,
        tasksAssigned: totalTasksAssigned,
        tasksCompleted,
        tasksOverdue,
        unreadNotifications: unreadNotifCount,
      },
      createdProjects: (createdProjects || []).map((p) => ({
        ...p,
        pendingRequestsCount: pendingCountMap[p._id.toString()] || 0,
      })),
      applications: (applications || []).map((app) => ({
        _id: app._id,
        status: app.status,
        createdAt: app.createdAt,
        projectTitle: app.projectId?.title || "Deleted project",
        projectId: app.projectId?._id,
      })),
      myRecentTasks: myTasks.slice(0, 5),
    });
  } catch (err) {
    console.error("GET /api/users/me/dashboard error:", err);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const {
      name,
      college,
      branch,
      year,
      bio,
      skills,
      interests,
      github,
      linkedin,
      experienceLevel,
      preferredCategories,
      learningGoals,
    } = req.body;

    if (skills && !Array.isArray(skills)) {
      return res.status(400).json({ message: "Skills must be an array" });
    }

    if (skills) {
      const invalid = skills.filter((s) => !PREDEFINED_SKILLS.includes(s));
      if (invalid.length) {
        return res.status(400).json({ message: "Invalid skills selected" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.dbUser._id,
      {
        name: name !== undefined ? name : req.dbUser.name,
        college: college !== undefined ? college : req.dbUser.college,
        branch: branch !== undefined ? branch : req.dbUser.branch,
        year: year !== undefined ? year : req.dbUser.year,
        bio: bio !== undefined ? bio : req.dbUser.bio,
        skills: skills !== undefined ? skills : req.dbUser.skills,
        interests: Array.isArray(interests)
          ? interests
          : typeof interests === "string"
          ? interests.split(",").map((i) => i.trim()).filter(Boolean)
          : req.dbUser.interests,
        github: github !== undefined ? github : req.dbUser.github,
        linkedin: linkedin !== undefined ? linkedin : req.dbUser.linkedin,
        experienceLevel:
          experienceLevel && ["Beginner", "Intermediate", "Advanced"].includes(experienceLevel)
            ? experienceLevel
            : req.dbUser.experienceLevel || "Intermediate",
        preferredCategories: Array.isArray(preferredCategories)
          ? preferredCategories
          : req.dbUser.preferredCategories || [],
        learningGoals: Array.isArray(learningGoals)
          ? learningGoals
          : typeof learningGoals === "string"
          ? learningGoals.split(",").map((g) => g.trim()).filter(Boolean)
          : req.dbUser.learningGoals || [],
      },
      { new: true }
    );

    res.json({ user: updated });
  } catch (err) {
    console.error("PUT /api/users/profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
