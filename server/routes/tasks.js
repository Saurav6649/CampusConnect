import express from "express";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { logActivity } from "../utils/activity.js";
import { createNotification } from "../utils/notifications.js";
import { getIO } from "../socket.js";

const router = express.Router();

const VALID_STATUSES = ["backlog", "todo", "in_progress", "in_review", "completed"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

// Helper to check if user is a member or owner of the project
async function getAuthorizedProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isMember = project.members.some(
    (m) => m.toString() === userId.toString()
  );
  if (!isMember) return null;
  return project;
}

// ── GET /api/tasks/my-tasks ────────────────────────────────────────────────
router.get("/my-tasks", async (req, res) => {
  try {
    const { status, priority, projectId, search } = req.query;
    const filter = { assigneeId: req.dbUser._id };

    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      filter.priority = priority;
    }
    if (projectId) {
      filter.projectId = projectId;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: String(search), $options: "i" } },
        { description: { $regex: String(search), $options: "i" } },
      ];
    }

    const tasks = await Task.find(filter)
      .populate("projectId", "title category status isOpen deadline")
      .populate("creatorId", "name email college")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    res.json({ tasks });
  } catch (error) {
    console.error("GET /my-tasks error:", error);
    res.status(500).json({ message: "Failed to load tasks" });
  }
});

// ── GET /api/tasks/project/:projectId ──────────────────────────────────────
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const tasks = await Task.find({ projectId: project._id })
      .populate("assigneeId", "name email college branch")
      .populate("creatorId", "name email college")
      .populate("comments.userId", "name email")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json({ tasks });
  } catch (error) {
    console.error("GET /tasks/project/:id error:", error);
    res.status(500).json({ message: "Failed to load project tasks" });
  }
});

// ── POST /api/tasks/project/:projectId ─────────────────────────────────────
router.post("/project/:projectId", async (req, res) => {
  try {
    const project = await getAuthorizedProject(req.params.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not a member of this project" });
    }

    const {
      title,
      description = "",
      status = "todo",
      priority = "medium",
      assigneeId = null,
      startDate = null,
      dueDate = null,
      labels = [],
      attachments = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority value" });
    }

    // If assignee provided, verify they are in project.members
    if (assigneeId) {
      const isAssigneeMember = project.members.some(
        (m) => m.toString() === assigneeId.toString()
      );
      if (!isAssigneeMember) {
        return res.status(400).json({ message: "Assignee must be a member of the project" });
      }
    }

    const taskCount = await Task.countDocuments({
      projectId: project._id,
      status,
    });

    const task = await Task.create({
      projectId: project._id,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId || null,
      creatorId: req.dbUser._id,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      labels: Array.isArray(labels) ? labels : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      order: taskCount,
      activity: [
        {
          userId: req.dbUser._id,
          action: "created",
          timestamp: new Date(),
        },
      ],
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assigneeId", "name email college branch")
      .populate("creatorId", "name email college")
      .lean();

    // Log activity
    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "task_created",
      details: `Created task "${task.title}"`,
    });

    // Notify assignee if different from creator
    if (assigneeId && assigneeId.toString() !== req.dbUser._id.toString()) {
      await createNotification({
        recipientId: assigneeId,
        senderId: req.dbUser._id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `${req.dbUser.name} assigned you to "${task.title}" in ${project.title}`,
        link: `/projects/${project._id}`,
        projectId: project._id,
      });
    }

    // Real-time broadcast to project room
    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("task_created", populatedTask);
    }

    res.status(201).json({ task: populatedTask });
  } catch (error) {
    console.error("POST /tasks/project/:id error:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// ── GET /api/tasks/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assigneeId", "name email college branch")
      .populate("creatorId", "name email college")
      .populate("comments.userId", "name email")
      .lean();

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await getAuthorizedProject(task.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not authorized to view this task" });
    }

    res.json({ task });
  } catch (error) {
    console.error("GET /tasks/:id error:", error);
    res.status(500).json({ message: "Failed to load task details" });
  }
});

// ── PUT /api/tasks/:id ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await getAuthorizedProject(task.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not authorized to edit this task" });
    }

    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      startDate,
      dueDate,
      labels,
      order,
      attachments,
    } = req.body;

    const previousStatus = task.status;
    const previousAssignee = task.assigneeId ? task.assigneeId.toString() : null;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
      task.title = title.trim();
    }
    if (description !== undefined) task.description = description.trim();

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      task.status = status;
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority value" });
      }
      task.priority = priority;
    }

    if (assigneeId !== undefined) {
      if (assigneeId) {
        const isMember = project.members.some(
          (m) => m.toString() === assigneeId.toString()
        );
        if (!isMember) {
          return res.status(400).json({ message: "Assignee must be a member of the project" });
        }
        task.assigneeId = assigneeId;
      } else {
        task.assigneeId = null;
      }
    }

    if (startDate !== undefined) {
      task.startDate = startDate ? new Date(startDate) : null;
    }
    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (labels !== undefined && Array.isArray(labels)) {
      task.labels = labels;
    }
    if (attachments !== undefined && Array.isArray(attachments)) {
      task.attachments = attachments;
    }
    if (order !== undefined) {
      task.order = Number(order) || 0;
    }

    // Add activity record
    let actionDesc = "updated";
    if (status !== undefined && status !== previousStatus) {
      actionDesc = `moved to ${status.replace("_", " ")}`;
    }
    task.activity.push({
      userId: req.dbUser._id,
      action: actionDesc,
      timestamp: new Date(),
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assigneeId", "name email college branch")
      .populate("creatorId", "name email college")
      .populate("comments.userId", "name email")
      .lean();

    // Log project activity if completed
    if (status === "completed" && previousStatus !== "completed") {
      await logActivity({
        projectId: project._id,
        userId: req.dbUser._id,
        action: "task_completed",
        details: `Completed task "${task.title}"`,
      });
    } else {
      await logActivity({
        projectId: project._id,
        userId: req.dbUser._id,
        action: "task_updated",
        details: `Updated task "${task.title}" (${actionDesc})`,
      });
    }

    // If newly assigned, notify assignee
    const currentAssigneeStr = task.assigneeId ? task.assigneeId.toString() : null;
    if (
      currentAssigneeStr &&
      currentAssigneeStr !== previousAssignee &&
      currentAssigneeStr !== req.dbUser._id.toString()
    ) {
      await createNotification({
        recipientId: task.assigneeId,
        senderId: req.dbUser._id,
        type: "task_assigned",
        title: "Task Assigned",
        message: `${req.dbUser.name} assigned you to "${task.title}" in ${project.title}`,
        link: `/projects/${project._id}`,
        projectId: project._id,
      });
    }

    // Broadcast update to project room
    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("task_updated", populatedTask);
    }

    res.json({ task: populatedTask });
  } catch (error) {
    console.error("PUT /tasks/:id error:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// ── DELETE /api/tasks/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only project owner or task creator can delete
    const isOwner = project.creatorId.toString() === req.dbUser._id.toString();
    const isCreator = task.creatorId.toString() === req.dbUser._id.toString();

    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: "Only the project owner or task creator can delete this task" });
    }

    const taskId = task._id;
    const taskTitle = task.title;
    await task.deleteOne();

    await logActivity({
      projectId: project._id,
      userId: req.dbUser._id,
      action: "task_deleted",
      details: `Deleted task "${taskTitle}"`,
    });

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("task_deleted", { taskId });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE /tasks/:id error:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// ── POST /api/tasks/:id/comments ───────────────────────────────────────────
router.post("/:id/comments", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await getAuthorizedProject(task.projectId, req.dbUser._id);
    if (!project) {
      return res.status(403).json({ message: "You are not authorized to comment on this task" });
    }

    task.comments.push({
      userId: req.dbUser._id,
      text: text.trim(),
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("comments.userId", "name email")
      .lean();

    const newComment = populated.comments[populated.comments.length - 1];

    // Notify assignee if assignee is not commenter
    if (task.assigneeId && task.assigneeId.toString() !== req.dbUser._id.toString()) {
      await createNotification({
        recipientId: task.assigneeId,
        senderId: req.dbUser._id,
        type: "project_updated",
        title: "New Comment on Task",
        message: `${req.dbUser.name} commented on "${task.title}"`,
        link: `/projects/${project._id}`,
        projectId: project._id,
      });
    }

    const io = getIO();
    if (io) {
      io.to(`project_${project._id.toString()}`).emit("task_comment_added", {
        taskId: task._id,
        comment: newComment,
      });
    }

    res.status(201).json({ comment: newComment });
  } catch (error) {
    console.error("POST /tasks/:id/comments error:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
