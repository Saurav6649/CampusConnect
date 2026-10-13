import express from "express";
import Project from "../models/Project.js";
import JoinRequest from "../models/JoinRequest.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { logActivity } from "../utils/activity.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();

async function handleDecision(req, res, nextStatus) {
  const joinRequest = await JoinRequest.findById(req.params.id);
  if (!joinRequest) {
    return res.status(404).json({ message: "Join request not found" });
  }

  const project = await Project.findById(joinRequest.projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (project.creatorId.toString() !== req.dbUser._id.toString()) {
    return res.status(403).json({ message: "Only the owner can update join requests" });
  }

  if (joinRequest.status !== "pending") {
    return res.status(400).json({ message: "This request has already been processed" });
  }

  const student = await User.findById(joinRequest.studentId);
  const studentName = student?.name || "Student";

  if (nextStatus === "accepted") {
    if (project.members.length >= project.teamSize) {
      return res.status(400).json({ message: "Team is already full" });
    }

    if (project.members.map(String).includes(joinRequest.studentId.toString())) {
      return res.status(400).json({ message: "Student is already a member" });
    }

    joinRequest.status = "accepted";
    await joinRequest.save();

    project.members.push(joinRequest.studentId);

    if (project.members.length >= project.teamSize) {
      project.isOpen = false;
      await JoinRequest.updateMany(
        {
          projectId: project._id,
          status: "pending",
          _id: { $ne: joinRequest._id },
        },
        { status: "rejected" }
      );
    }

    await project.save();

    // Add student to project conversation
    await Conversation.findOneAndUpdate(
      { type: "project", projectId: project._id },
      { $addToSet: { participants: joinRequest.studentId } }
    );

    // Log activity
    await logActivity({
      projectId: project._id,
      userId: joinRequest.studentId,
      action: "member_joined",
      details: `${studentName} joined the team`,
    });

    // Notify student
    await createNotification({
      recipientId: joinRequest.studentId,
      senderId: req.dbUser._id,
      type: "join_request_accepted",
      title: "Join Request Accepted! 🎉",
      message: `Your request to join "${project.title}" has been accepted! You can now access the project workspace and team chat.`,
      link: `/projects/${project._id}`,
      projectId: project._id,
    });

    return res.json({ joinRequest, project });
  }

  joinRequest.status = "rejected";
  await joinRequest.save();

  // Notify student of rejection
  await createNotification({
    recipientId: joinRequest.studentId,
    senderId: req.dbUser._id,
    type: "join_request_rejected",
    title: "Join Request Update",
    message: `Your request to join "${project.title}" was declined. Feel free to explore other open projects!`,
    link: `/projects/${project._id}`,
    projectId: project._id,
  });

  res.json({ joinRequest });
}

router.put("/:id/accept", (req, res) => handleDecision(req, res, "accepted"));
router.put("/:id/reject", (req, res) => handleDecision(req, res, "rejected"));

export default router;
