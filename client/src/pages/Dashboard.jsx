import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckSquare,
  Clock,
  FolderKanban,
  MessageSquare,
  Plus,
  Users,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import api from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import Loader from "../components/Loader.jsx";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError("");
    return api
      .get("/users/me/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-lg font-bold text-rose-800">Something went wrong</p>
        <p className="mt-1 text-sm text-rose-600">{error}</p>
        <button
          onClick={load}
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data?.user) return <Loader label="Loading dashboard..." />;

  const name = data.user.name || "Student";
  const totalPending = (data.createdProjects || []).reduce(
    (sum, p) => sum + (p.pendingRequestsCount || 0),
    0
  );
  const tasksAssigned = data.metrics?.tasksAssigned || 0;
  const tasksCompleted = data.metrics?.tasksCompleted || 0;
  const tasksOverdue = data.metrics?.tasksOverdue || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome back, {name} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Collaborate on your teams, track assignments, and view project updates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MessageSquare size={15} /> Team Chat
          </Link>
          <Link
            to="/projects/create"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus size={16} /> New Project
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FolderKanban size={18} />
            </div>
            <span className="text-xs font-semibold">Projects Created</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{data.metrics.projectsCreated}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users size={18} />
            </div>
            <span className="text-xs font-semibold">Active Teams</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{data.metrics.activeMemberships}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CheckSquare size={18} />
            </div>
            <span className="text-xs font-semibold">My Assigned Tasks</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{tasksAssigned}</p>
            <span className="text-xs font-medium text-emerald-600">
              ({tasksCompleted} completed)
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Bell size={18} />
            </div>
            <span className="text-xs font-semibold">Pending Requests</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{totalPending}</p>
            {tasksOverdue > 0 && (
              <span className="text-xs font-bold text-rose-600">
                • {tasksOverdue} overdue task{tasksOverdue > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Sections: Created Projects & Applications & Tasks */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Created Projects */}
        <div className="space-y-6 lg:col-span-2">
          {/* Projects Created */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Your Created Projects</h2>
              <Link to="/projects/create" className="text-xs font-bold text-indigo-600 hover:underline">
                + New Project
              </Link>
            </div>

            {data.createdProjects?.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="You haven't created any projects yet"
                description="Start a project to find teammates with matching skills on campus."
                actionLabel="Create Project"
                actionTo="/projects/create"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.createdProjects.map((p) => (
                  <div key={p._id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/projects/${p._id}`}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 line-clamp-1"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.category} • {p.members?.length || 1}/{p.teamSize} members
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.pendingRequestsCount > 0 && (
                        <Link
                          to={`/projects/${p._id}?tab=team`}
                          className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700"
                        >
                          {p.pendingRequestsCount} Pending
                        </Link>
                      )}
                      <Link
                        to={`/projects/${p._id}`}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Workspace →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications / Join Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Your Project Applications</h2>

            {data.applications?.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No join requests sent"
                description="Explore projects to apply and join teams looking for your skills."
                actionLabel="Browse Projects"
                actionTo="/projects"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.applications.map((app) => (
                  <div key={app._id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {app.projectTitle}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        Applied on {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          statusStyles[app.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {app.status}
                      </span>
                      {app.projectId && (
                        <Link
                          to={`/projects/${app.projectId}`}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Tasks Widget & Quick Links */}
        <aside className="space-y-6">
          {/* Quick Tasks Widget */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare size={16} className="text-indigo-600" /> My Tasks
              </h3>
              <Link to="/my-tasks" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all →
              </Link>
            </div>

            {data.myRecentTasks?.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                No active tasks assigned.
              </p>
            ) : (
              <div className="space-y-2">
                {data.myRecentTasks.map((t) => (
                  <div
                    key={t._id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">{t.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                          t.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                    {t.dueDate && (
                      <span className="mt-1 block text-[10px] text-slate-400">
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
              <Sparkles size={16} className="text-indigo-600" /> Collaboration Hub
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Connect with campus builders and coordinate on deadlines in real-time.
            </p>
            <div className="space-y-2">
              <Link
                to="/projects?tab=recommended"
                className="block rounded-xl bg-white p-2.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 transition-colors"
              >
                ✨ View Recommended Projects
              </Link>
              <Link
                to="/chat"
                className="block rounded-xl bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                💬 Open Team Messages
              </Link>
              <Link
                to="/profile"
                className="block rounded-xl bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                👤 Update Skills & Profile
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
