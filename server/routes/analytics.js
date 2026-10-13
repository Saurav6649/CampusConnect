import express from "express";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Activity from "../models/Activity.js";

const router = express.Router();

// ── GET /api/analytics/project/:projectId ──────────────────────────────────
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("members", "name email college branch")
      .populate("creatorId", "name email college branch")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember = project.members.some(
      (m) => (m._id || m).toString() === req.dbUser._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const [tasks, milestones, recentActivity] = await Promise.all([
      Task.find({ projectId: project._id }).lean(),
      Milestone.find({ projectId: project._id }).lean(),
      Activity.find({ projectId: project._id })
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const now = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const inReviewTasks = tasks.filter((t) => t.status === "in_review").length;
    const todoTasks = tasks.filter((t) => t.status === "todo").length;
    const backlogTasks = tasks.filter((t) => t.status === "backlog").length;

    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
    ).length;

    const progressPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // Priority counts
    const priorityDistribution = {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
      critical: tasks.filter((t) => t.priority === "critical").length,
    };

    // Milestones metrics
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === "completed").length;
    const milestoneProgress =
      totalMilestones === 0
        ? 0
        : Math.round((completedMilestones / totalMilestones) * 100);

    // Member contribution metrics
    const memberContributions = project.members.map((member) => {
      const memberIdStr = (member._id || member).toString();
      const memberTasks = tasks.filter(
        (t) => t.assigneeId && t.assigneeId.toString() === memberIdStr
      );
      const assigned = memberTasks.length;
      const completed = memberTasks.filter((t) => t.status === "completed").length;
      const inProgress = memberTasks.filter((t) => t.status === "in_progress").length;
      const overdue = memberTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
      ).length;

      return {
        member: {
          _id: member._id,
          name: member.name,
          email: member.email,
          college: member.college,
        },
        tasksAssigned: assigned,
        tasksCompleted: completed,
        tasksInProgress: inProgress,
        tasksOverdue: overdue,
        completionRate: assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
      };
    });

    res.json({
      project: {
        _id: project._id,
        title: project.title,
        status: project.status,
        teamSize: project.teamSize,
        memberCount: project.members.length,
      },
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        inReviewTasks,
        todoTasks,
        backlogTasks,
        overdueTasks,
        progressPercentage,
        totalMilestones,
        completedMilestones,
        milestoneProgress,
      },
      priorityDistribution,
      memberContributions,
      recentActivity,
    });
  } catch (error) {
    console.error("GET /analytics/project/:id error:", error);
    res.status(500).json({ message: "Failed to load project analytics" });
  }
});

// ── GET /api/analytics/user ────────────────────────────────────────────────
router.get("/user", async (req, res) => {
  try {
    const userId = req.dbUser._id;
    const now = new Date();
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const [createdCount, memberships, myTasks] = await Promise.all([
      Project.countDocuments({ creatorId: userId }),
      Project.countDocuments({ members: userId }),
      Task.find({ assigneeId: userId })
        .populate("projectId", "title status")
        .lean(),
    ]);

    const totalTasksAssigned = myTasks.length;
    const tasksCompleted = myTasks.filter((t) => t.status === "completed").length;
    const tasksInProgress = myTasks.filter((t) => t.status === "in_progress").length;
    const tasksOverdue = myTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
    ).length;

    const upcomingDeadlines = myTasks
      .filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) >= now &&
          new Date(t.dueDate) <= inTwoWeeks &&
          t.status !== "completed"
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    res.json({
      projectsCreated: createdCount,
      activeMemberships: memberships,
      tasks: {
        total: totalTasksAssigned,
        completed: tasksCompleted,
        inProgress: tasksInProgress,
        overdue: tasksOverdue,
        completionRate:
          totalTasksAssigned === 0
            ? 0
            : Math.round((tasksCompleted / totalTasksAssigned) * 100),
      },
      upcomingDeadlines,
    });
  } catch (error) {
    console.error("GET /analytics/user error:", error);
    res.status(500).json({ message: "Failed to load user analytics" });
  }
});

export default router;
