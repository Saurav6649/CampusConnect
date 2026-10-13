import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket && socket.connected) {
    return socket;
  }

  const backendUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
    .replace(/\/api\/?$/, "");

  socket = io(backendUrl, {
    auth: {
      token: token ? `Bearer ${token}` : undefined,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    // Connected to server socket
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket connect error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
