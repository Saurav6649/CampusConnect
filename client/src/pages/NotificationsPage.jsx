import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  ExternalLink,
  MessageSquare,
  Award,
  Trash2,
  Users,
} from "lucide-react";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications?limit=100");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllAsRead() {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteNotif(id) {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  function getNotifIcon(type) {
    if (type.includes("task")) return <CheckSquare size={16} className="text-amber-600" />;
    if (type.includes("message")) return <MessageSquare size={16} className="text-indigo-600" />;
    if (type.includes("milestone")) return <Award size={16} className="text-emerald-600" />;
    if (type.includes("member") || type.includes("join"))
      return <Users size={16} className="text-purple-600" />;
    return <Bell size={16} className="text-slate-600" />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Inbox</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Notification Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time updates on your teams, tasks, join requests, and direct messages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors ${
            filter === "unread"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <Loader label="Loading notifications..." />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description="You'll be alerted whenever someone requests to join your team, assigns a task, or sends a message."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs overflow-hidden">
          {filtered.map((notif) => (
            <div
              key={notif._id}
              className={`p-4 transition-colors hover:bg-slate-50/80 flex items-start gap-4 ${
                !notif.read ? "bg-indigo-50/20" : ""
              }`}
            >
              <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                {getNotifIcon(notif.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{notif.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-600">{notif.message}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(notif.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {notif.link && (
                    <Link
                      to={notif.link}
                      onClick={() => !notif.read && markAsRead(notif._id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View details <ExternalLink size={12} />
                    </Link>
                  )}
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif._id)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(notif._id)}
                    className="ml-auto text-slate-400 hover:text-rose-600"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
