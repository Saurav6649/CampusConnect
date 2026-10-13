import { Server as SocketIOServer } from "socket.io";
import User from "./models/User.js";
import Project from "./models/Project.js";
import Conversation from "./models/Conversation.js";

let io = null;

function resolveClerkUserIdFromToken(token) {
  if (!token) return null;
  try {
    const raw = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    const parts = raw.split(".");
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
      return payload.sub || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function initSocket(httpServer, allowedOrigins) {
  io = new SocketIOServer(httpServer, {
    cors: {
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
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;
      const clerkId = resolveClerkUserIdFromToken(token);

      if (!clerkId) {
        return next(new Error("Authentication token required"));
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        return next(new Error("User not found in database"));
      }

      socket.dbUser = user;
      next();
    } catch (err) {
      next(new Error("Socket authentication failed: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.dbUser._id.toString();
    // Join personal user room for direct notifications and messages
    socket.join(`user_${userId}`);

    // Join conversation room
    socket.on("join_conversation", async (conversationId) => {
      try {
        if (!conversationId) return;
        const conv = await Conversation.findById(conversationId);
        if (!conv) {
          return socket.emit("error", { message: "Conversation not found" });
        }

        // Authorize: user must be in participants or a member of the project
        const isParticipant = conv.participants.some(
          (p) => p.toString() === userId
        );
        let authorized = isParticipant;

        if (!authorized && conv.projectId) {
          const project = await Project.findById(conv.projectId);
          if (
            project &&
            project.members.some((m) => m.toString() === userId)
          ) {
            authorized = true;
          }
        }

        if (authorized) {
          socket.join(`conv_${conversationId}`);
          socket.emit("joined_conversation", { conversationId });
        } else {
          socket.emit("error", { message: "Unauthorized to join this conversation" });
        }
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // Typing indicators
    socket.on("typing_start", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit("user_typing", {
          conversationId,
          user: {
            _id: socket.dbUser._id,
            name: socket.dbUser.name,
          },
        });
      }
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit("user_stopped_typing", {
          conversationId,
          userId: socket.dbUser._id,
        });
      }
    });

    // Join project room for real-time task and activity updates
    socket.on("join_project", async (projectId) => {
      try {
        if (!projectId) return;
        const project = await Project.findById(projectId);
        if (
          project &&
          project.members.some((m) => m.toString() === userId)
        ) {
          socket.join(`project_${projectId}`);
        }
      } catch (err) {
        // silently ignore invalid project
      }
    });

    socket.on("leave_project", (projectId) => {
      if (projectId) {
        socket.leave(`project_${projectId}`);
      }
    });

    socket.on("disconnect", () => {
      // Automatic cleanup handled by socket.io
    });
  });

  return io;
}

export function getIO() {
  return io;
}
