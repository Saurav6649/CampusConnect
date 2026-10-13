import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, ExternalLink, X, CheckSquare, MessageSquare, Award } from "lucide-react";
import api from "../api/client.js";
import { getSocket } from "../socket.js";

const POLL_INTERVAL_MS = 25_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [acting, setActing] = useState("");
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchAllNotifications = useCallback(async () => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        api.get("/users/me/notifications"),
        api.get("/notifications?limit=6"),
      ]);

      setJoinRequests(reqRes.data.notifications || []);
      setNotifications(notifRes.data.notifications || []);

      const reqCount = reqRes.data.count || 0;
      const notifUnread = notifRes.data.unreadCount || 0;
      setUnreadCount(reqCount + notifUnread);
    } catch {
      // Silently fail for polling
    }
  }, []);

  useEffect(() => {
    fetchAllNotifications();
    const timer = setInterval(fetchAllNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAllNotifications]);

  // Real-time socket listener for incoming notifications
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 5)]);
      setUnreadCount((c) => c + 1);
    };

    socket.on("new_notification", handleNewNotif);
    return () => {
      socket.off("new_notification", handleNewNotif);
    };
  }, []);

  // Window focus auto-refresh
  useEffect(() => {
    const handleFocus = () => fetchAllNotifications();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchAllNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function decideJoinRequest(requestId, action) {
    setActing(requestId);
    setError("");
    try {
      await api.put(`/join-requests/${requestId}/${action}`);
      await fetchAllNotifications();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setActing("");
    }
  }

  async function markAsRead(notifId, link) {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        setOpen(false);
        navigate(link);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="notification-panel absolute right-0 top-11 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-500">
                {unreadCount === 0 ? "All caught up" : `${unreadCount} unread updates`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                View all
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {error && (
            <p className="mx-3 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
            {/* Pending Join Requests section */}
            {joinRequests.length > 0 && (
              <div className="bg-amber-50/40 p-2">
                <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Join Requests ({joinRequests.length})
                </p>
                <div className="space-y-1">
                  {joinRequests.map((req) => {
                    const student = req.studentId;
                    const isActing = acting === req._id;
                    return (
                      <div
                        key={req._id}
                        className="rounded-xl bg-white p-2.5 border border-amber-100/80 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {student?.name || "Student"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {student?.college || student?.email}
                            </p>
                            <p className="mt-0.5 text-[11px] text-indigo-600 font-medium">
                              Wants to join{" "}
                              <Link
                                to={`/projects/${req.projectId}`}
                                className="underline hover:text-indigo-800"
                                onClick={() => setOpen(false)}
                              >
                                {req.projectTitle}
                              </Link>
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              disabled={isActing}
                              onClick={() => decideJoinRequest(req._id, "accept")}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              title="Accept"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => decideJoinRequest(req._id, "reject")}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Activity Notifications */}
            {notifications.length === 0 && joinRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell size={32} className="text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No new notifications</p>
                <p className="text-xs text-slate-400">Team alerts and messages will show here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => markAsRead(notif._id, notif.link)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 flex items-start gap-3 ${
                    !notif.read ? "bg-indigo-50/30" : ""
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {notif.type.includes("task") ? (
                      <CheckSquare size={14} />
                    ) : notif.type.includes("message") ? (
                      <MessageSquare size={14} />
                    ) : notif.type.includes("milestone") ? (
                      <Award size={14} />
                    ) : (
                      <Bell size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleDateString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer link */}
          <div className="border-t border-slate-100 px-4 py-2.5 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Go to Notification Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
