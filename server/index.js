import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { requireClerkAuth, requireDbUser } from "./middleware/requireDbUser.js";
import { initSocket } from "./socket.js";

import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import joinRequestRoutes from "./routes/joinRequests.js";
import taskRoutes from "./routes/tasks.js";
import milestoneRoutes from "./routes/milestones.js";
import resourceRoutes from "./routes/resources.js";
import activityRoutes from "./routes/activity.js";
import conversationRoutes from "./routes/conversations.js";
import notificationRoutes from "./routes/notifications.js";
import analyticsRoutes from "./routes/analytics.js";

const app = express();
const PORT = process.env.PORT || 5000;

const isDummySecret =
  !process.env.CLERK_SECRET_KEY ||
  process.env.CLERK_SECRET_KEY === "sk_test_replace_me" ||
  process.env.CLERK_SECRET_KEY.includes("replace_me");

if (isDummySecret) {
  console.warn(
    "⚠️  CLERK_SECRET_KEY is missing or dummy — running with JWT-decode fallback (dev mode)"
  );
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_ORIGIN,
]
  .filter(Boolean)
  .map((o) => o.trim().replace(/\/+$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = origin.trim().replace(/\/+$/, "");
      if (
        allowedOrigins.includes(clean) ||
        clean.endsWith(".vercel.app") ||
        clean.includes("localhost")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, version: "2.0.0", platform: "CampusConnect" });
});

// Middleware chain for protected routes
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

app.use((err, _req, res, _next) => {
  console.error("Global express error:", err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer, allowedOrigins);

connectDB(process.env.MONGODB_URI)
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server & WebSocket running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
