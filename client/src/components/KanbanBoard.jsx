import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Paperclip,
  Plus,
  User,
  AlertCircle,
} from "lucide-react";
import api from "../api/client.js";

const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "todo", title: "To Do", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "in_progress", title: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "in_review", title: "In Review", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "completed", title: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

const PRIORITY_BADGES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700 border border-blue-100",
  high: "bg-amber-50 text-amber-700 border border-amber-100",
  critical: "bg-rose-50 text-rose-700 border border-rose-200 font-bold",
};

export default function KanbanBoard({
  tasks = [],
  members = [],
  onTaskClick,
  onAddTask,
  onTaskMoved,
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === colId) return;

    // Trigger parent state update & backend call
    onTaskMoved(taskId, colId);
  };

  const now = new Date();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);
        const isDragOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-2xl bg-slate-50/70 border p-3 min-h-[500px] transition-colors ${
              isDragOver
                ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200"
                : "border-slate-200"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.title}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => onAddTask(col.id)}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                title={`Add task to ${col.title}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Task list */}
            <div className="flex-1 space-y-2.5 pt-3 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center p-3">
                  <p className="text-[11px] text-slate-400">Drop tasks here</p>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < now &&
                    task.status !== "completed";

                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      onClick={() => onTaskClick(task)}
                      className="group cursor-grab active:cursor-grabbing rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"
                    >
                      {/* Priority and labels */}
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            PRIORITY_BADGES[task.priority] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {isOverdue && (
                          <span className="flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            <AlertCircle size={10} /> Overdue
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-indigo-600 line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Description preview */}
                      {task.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Labels */}
                      {task.labels?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.labels.slice(0, 3).map((lbl, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium"
                            >
                              #{lbl}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Due date + Assignee + Comments/Attachments counts */}
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"
                              }`}
                            >
                              <Calendar size={11} />
                              {new Date(task.dueDate).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}

                          {task.comments?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <MessageSquare size={11} /> {task.comments.length}
                            </span>
                          )}

                          {task.attachments?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <Paperclip size={11} /> {task.attachments.length}
                            </span>
                          )}
                        </div>

                        {/* Assignee Avatar */}
                        {task.assigneeId ? (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700"
                            title={`Assigned to ${task.assigneeId.name || "Student"}`}
                          >
                            {task.assigneeId.name?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">Unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
