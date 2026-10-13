import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  Filter,
  Search,
  FolderKanban,
} from "lucide-react";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import TaskModal from "../components/TaskModal.jsx";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "backlog", label: "Backlog" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedTask, setSelectedTask] = useState(null);

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/tasks/my-tasks", { params });
      setTasks(res.data.tasks || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter]);

  // Quick status change
  async function updateStatus(taskId, newStatus) {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error(err);
    }
  }

  const now = new Date();
  const totalAssigned = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Workload</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">My Assigned Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and complete your responsibilities across all your active project teams.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Assigned</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalAssigned}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-xs">
          <p className="text-xs font-semibold text-blue-700">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700">Completed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 shadow-xs">
          <p className="text-xs font-semibold text-rose-700">Overdue</p>
          <p className="mt-2 text-2xl font-bold text-rose-900">{overdueCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadTasks()}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks Table / List */}
      {loading ? (
        <Loader label="Loading your tasks..." />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="You don't have any tasks matching the current filters. Check your project workspaces to create or take on tasks."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden divide-y divide-slate-100">
          {tasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < now &&
              task.status !== "completed";

            return (
              <div
                key={task._id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {task.projectId && (
                      <Link
                        to={`/projects/${task.projectId._id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 hover:underline"
                      >
                        <FolderKanban size={11} />
                        {task.projectId.title}
                      </Link>
                    )}

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        task.priority === "critical"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : task.priority === "high"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {task.priority}
                    </span>

                    {isOverdue && (
                      <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        <AlertCircle size={10} /> Overdue
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => setSelectedTask(task)}
                    className="text-sm font-semibold text-slate-900 cursor-pointer hover:text-indigo-600"
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    {task.dueDate && (
                      <span
                        className={`flex items-center gap-1 ${
                          isOverdue ? "text-rose-600 font-semibold" : ""
                        }`}
                      >
                        <Calendar size={12} />
                        Due:{" "}
                        {new Date(task.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {task.labels?.length > 0 && (
                      <span>Labels: {task.labels.join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <select
                    value={task.status}
                    onChange={(e) => updateStatus(task._id, e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>

                  <button
                    onClick={() => setSelectedTask(task)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={selectedTask.projectId?._id}
          onClose={() => setSelectedTask(null)}
          onSaved={(updated) => {
            setTasks((prev) =>
              prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t))
            );
          }}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t._id !== id));
          }}
        />
      )}
    </div>
  );
}
