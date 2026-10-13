import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

// Models
import User from "../models/User.js";
import Project from "../models/Project.js";
import JoinRequest from "../models/JoinRequest.js";
import Task from "../models/Task.js";
import Milestone from "../models/Milestone.js";
import Resource from "../models/Resource.js";
import Activity from "../models/Activity.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";

// Routes & Middleware
import { requireClerkAuth, requireDbUser } from "../middleware/requireDbUser.js";
import userRoutes from "../routes/users.js";
import projectRoutes from "../routes/projects.js";
import joinRequestRoutes from "../routes/joinRequests.js";
import taskRoutes from "../routes/tasks.js";
import milestoneRoutes from "../routes/milestones.js";
import resourceRoutes from "../routes/resources.js";
import activityRoutes from "../routes/activity.js";
import conversationRoutes from "../routes/conversations.js";
import notificationRoutes from "../routes/notifications.js";
import analyticsRoutes from "../routes/analytics.js";

function createJwt(sub) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64");
  return `${header}.${payload}.mock_sig`;
}

const ALICE_TOKEN = createJwt("clerk_test_alice_123");
const BOB_TOKEN = createJwt("clerk_test_bob_456");
const CHARLIE_TOKEN = createJwt("clerk_test_charlie_789");

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

test.before(async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/CampusConnect";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  const authChain = [requireClerkAuth, requireDbUser];
  app.use("/api/users", ...authChain, userRoutes);
  app.use("/api/projects", ...authChain, projectRoutes);
  app.use("/api/join-requests", ...authChain, joinRequestRoutes);
  app.use("/api/tasks", ...authChain, taskRoutes);
  app.use("/api/milestones", ...authChain, milestoneRoutes);
  app.use("/api/resources", ...authChain, resourceRoutes);
  app.use("/api/activity", ...authChain, activityRoutes);
  app.use("/api/conversations", ...authChain, conversationRoutes);
  app.use("/api/notifications", ...authChain, notificationRoutes);
  app.use("/api/analytics", ...authChain, analyticsRoutes);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Clean up test data created with clerk_test_ prefix
  const testUsers = await User.find({ clerkId: /^clerk_test_/ }).select("_id");
  const testUserIds = testUsers.map((u) => u._id);
  if (testUserIds.length > 0) {
    const testProjects = await Project.find({ creatorId: { $in: testUserIds } }).select("_id");
    const testProjIds = testProjects.map((p) => p._id);

    await Promise.all([
      User.deleteMany({ _id: { $in: testUserIds } }),
      Project.deleteMany({ _id: { $in: testProjIds } }),
      JoinRequest.deleteMany({ $or: [{ studentId: { $in: testUserIds } }, { projectId: { $in: testProjIds } }] }),
      Task.deleteMany({ projectId: { $in: testProjIds } }),
      Milestone.deleteMany({ projectId: { $in: testProjIds } }),
      Resource.deleteMany({ projectId: { $in: testProjIds } }),
      Activity.deleteMany({ projectId: { $in: testProjIds } }),
      Conversation.deleteMany({ $or: [{ projectId: { $in: testProjIds } }, { participants: { $in: testUserIds } }] }),
      Notification.deleteMany({ recipientId: { $in: testUserIds } }),
    ]);
  }
});

let projectId = null;
let taskId = null;
let milestoneId = null;
let resourceId = null;
let conversationId = null;
let messageId = null;

test("1. User Profiles & Directory Search", async () => {
  // Alice updates profile
  const aliceRes = await request("/api/users/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: {
      name: "Alice Engineer",
      college: "Campus Tech",
      branch: "Computer Science",
      skills: ["React", "Node.js", "MongoDB"],
      experienceLevel: "Advanced",
      preferredCategories: ["Web Development"],
    },
  });
  assert.equal(aliceRes.status, 200);
  assert.equal(aliceRes.data.user.name, "Alice Engineer");
  assert.equal(aliceRes.data.user.experienceLevel, "Advanced");

  // Bob updates profile
  const bobRes = await request("/api/users/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
    body: {
      name: "Bob Developer",
      college: "Campus Tech",
      branch: "Information Technology",
      skills: ["React"],
      experienceLevel: "Intermediate",
      preferredCategories: ["Web Development"],
    },
  });
  assert.equal(bobRes.status, 200);
  assert.equal(bobRes.data.user.name, "Bob Developer");

  // Search users
  const searchRes = await request("/api/users/search?q=Bob", {
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
  });
  assert.equal(searchRes.status, 200);
  assert.ok(searchRes.data.users.some((u) => u.name === "Bob Developer"));
});

test("2. Project Creation & Skill-Based Recommendations", async () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);

  const createRes = await request("/api/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: {
      title: "Campus Study Collaboration",
      description: "Building an open student platform",
      category: "Web Development",
      requiredSkills: ["React", "Node.js", "MongoDB"],
      teamSize: 3,
      deadline: future.toISOString(),
      whatsappNumber: "+1234567890",
    },
  });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.data.project._id);
  projectId = createRes.data.project._id;

  // Bob checks recommendations
  const recRes = await request("/api/projects/recommendations", {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(recRes.status, 200);
  const rec = recRes.data.recommendations.find((r) => r.project._id === projectId);
  assert.ok(rec, "Project should be recommended to Bob");
  assert.ok(rec.matchScore > 0, "Match score should be calculated");
  assert.ok(rec.matchedSkills.includes("React"));
  assert.ok(rec.missingSkills.includes("Node.js"));
  assert.ok(rec.reason.length > 0);
});

test("3. Join Request, Notification, and Approval Workflow", async () => {
  // Bob requests to join Alice's project
  const joinRes = await request(`/api/projects/${projectId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(joinRes.status, 201);
  const requestId = joinRes.data.joinRequest._id;

  // Alice sees notification
  const notifRes = await request("/api/users/me/notifications", {
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
  });
  assert.equal(notifRes.status, 200);
  assert.ok(notifRes.data.notifications.some((n) => n._id === requestId));

  // Alice accepts Bob
  const acceptRes = await request(`/api/join-requests/${requestId}/accept`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
  });
  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.data.joinRequest.status, "accepted");

  // Verify Bob received notification
  const bobNotifs = await request("/api/notifications", {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(bobNotifs.status, 200);
  assert.ok(bobNotifs.data.notifications.some((n) => n.type === "join_request_accepted"));
});

test("4. Project Workspace & Security Authorization Guards", async () => {
  // Charlie (non-member) tries to view workspace -> 403 Forbidden
  const forbiddenRes = await request(`/api/projects/${projectId}/workspace`, {
    headers: { Authorization: `Bearer ${CHARLIE_TOKEN}` },
  });
  assert.equal(forbiddenRes.status, 403);

  // Bob (accepted member) views workspace -> 200 OK
  const bobWs = await request(`/api/projects/${projectId}/workspace`, {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(bobWs.status, 200);
  assert.equal(bobWs.data.isMember, true);
  assert.equal(bobWs.data.project.members.length, 2);
});

test("5. Task Management (Kanban, Assignment, Comments)", async () => {
  // Charlie (non-member) cannot create task in project -> 403
  const badTask = await request(`/api/tasks/project/${projectId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CHARLIE_TOKEN}` },
    body: { title: "Hacked task" },
  });
  assert.equal(badTask.status, 403);

  // Alice creates task assigned to Bob
  const bobUser = await User.findOne({ clerkId: "clerk_test_bob_456" });
  const taskRes = await request(`/api/tasks/project/${projectId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: {
      title: "Develop frontend views",
      description: "Implement responsive layouts",
      status: "todo",
      priority: "high",
      assigneeId: bobUser._id.toString(),
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(taskRes.status, 201);
  assert.ok(taskRes.data.task._id);
  taskId = taskRes.data.task._id;

  // Bob checks My Tasks
  const myTasksRes = await request("/api/tasks/my-tasks", {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(myTasksRes.status, 200);
  assert.ok(myTasksRes.data.tasks.some((t) => t._id === taskId));

  // Bob moves task to in_progress
  const moveRes = await request(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
    body: { status: "in_progress" },
  });
  assert.equal(moveRes.status, 200);
  assert.equal(moveRes.data.task.status, "in_progress");

  // Bob adds comment
  const commentRes = await request(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
    body: { text: "Starting work on this today!" },
  });
  assert.equal(commentRes.status, 201);
  assert.equal(commentRes.data.comment.text, "Starting work on this today!");

  // Bob completes task
  const completeRes = await request(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
    body: { status: "completed" },
  });
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.task.status, "completed");
});

test("6. Milestones Management", async () => {
  const milestoneRes = await request(`/api/milestones/project/${projectId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: {
      title: "Sprint 1 Review",
      description: "Demonstrate prototype features",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
  });
  assert.equal(milestoneRes.status, 201);
  milestoneId = milestoneRes.data.milestone._id;

  // Mark milestone completed
  const doneRes = await request(`/api/milestones/${milestoneId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: { status: "completed" },
  });
  assert.equal(doneRes.status, 200);
  assert.equal(doneRes.data.milestone.status, "completed");
});

test("7. Resource Library & Validation", async () => {
  // Invalid URL rejected
  const badRes = await request(`/api/resources/project/${projectId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: { title: "Bad link", url: "not-a-valid-url" },
  });
  assert.equal(badRes.status, 400);

  // Valid resource added
  const goodRes = await request(`/api/resources/project/${projectId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: {
      title: "Main GitHub Repository",
      url: "https://github.com/example/campusconnect",
      type: "github",
      description: "Source code repository",
    },
  });
  assert.equal(goodRes.status, 201);
  resourceId = goodRes.data.resource._id;

  // Fetch resources
  const listRes = await request(`/api/resources/project/${projectId}`, {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.resources.some((r) => r._id === resourceId));
});

test("8. Real-time Team Chat & Direct Messaging", async () => {
  // Charlie cannot access project chat -> 403
  const badChat = await request(`/api/conversations/project/${projectId}`, {
    headers: { Authorization: `Bearer ${CHARLIE_TOKEN}` },
  });
  assert.equal(badChat.status, 403);

  // Alice gets project conversation
  const convRes = await request(`/api/conversations/project/${projectId}`, {
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
  });
  assert.equal(convRes.status, 200);
  conversationId = convRes.data.conversation._id;

  // Alice posts message
  const msgRes = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: { text: "Welcome to the team chat!" },
  });
  assert.equal(msgRes.status, 201);
  messageId = msgRes.data.message._id;

  // Bob reads messages
  const getMsgs = await request(`/api/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(getMsgs.status, 200);
  assert.ok(getMsgs.data.messages.some((m) => m._id === messageId));

  // Alice edits message
  const editRes = await request(`/api/conversations/messages/${messageId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: { text: "Welcome to the project team, everyone!" },
  });
  assert.equal(editRes.status, 200);
  assert.equal(editRes.data.message.isEdited, true);

  // Bob cannot delete Alice's message -> 403
  const badDelete = await request(`/api/conversations/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(badDelete.status, 403);

  // 1-to-1 Direct Messaging
  const bobUser = await User.findOne({ clerkId: "clerk_test_bob_456" });
  const dmRes = await request("/api/conversations/direct", {
    method: "POST",
    headers: { Authorization: `Bearer ${ALICE_TOKEN}` },
    body: { recipientId: bobUser._id.toString() },
  });
  assert.equal(dmRes.status, 200);
  assert.equal(dmRes.data.conversation.type, "direct");
});

test("9. Project Analytics Calculations", async () => {
  const analyticsRes = await request(`/api/analytics/project/${projectId}`, {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(analyticsRes.status, 200);
  assert.equal(analyticsRes.data.summary.totalTasks, 1);
  assert.equal(analyticsRes.data.summary.completedTasks, 1);
  assert.equal(analyticsRes.data.summary.progressPercentage, 100);
  assert.ok(analyticsRes.data.memberContributions.length >= 2);
});

test("10. Notification Center & Read Status", async () => {
  const notifsRes = await request("/api/notifications", {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(notifsRes.status, 200);

  // Mark all read
  const readAllRes = await request("/api/notifications/read-all", {
    method: "PUT",
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(readAllRes.status, 200);

  const afterRead = await request("/api/notifications", {
    headers: { Authorization: `Bearer ${BOB_TOKEN}` },
  });
  assert.equal(afterRead.data.unreadCount, 0);
});
