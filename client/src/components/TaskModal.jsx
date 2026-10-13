import { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  User,
  X,
  AlertCircle,
} from "lucide-react";
import api from "../api/client.js";

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-slate-600 bg-slate-100" },
  { value: "medium", label: "Medium", color: "text-blue-700 bg-blue-50" },
  { value: "high", label: "High", color: "text-amber-700 bg-amber-50" },
  { value: "critical", label: "Critical", color: "text-rose-700 bg-rose-50" },
];

export default function TaskModal({
  task, // null if creating new
  projectId,
  members = [],
  defaultStatus = "todo",
  onClose,
  onSaved,
  onDeleted,
}) {
  const isEditing = Boolean(task?._id);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || defaultStatus);
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId?._id || task?.assigneeId || "");
  const [startDate, setStartDate] = useState(
    task?.startDate ? task.startDate.split("T")[0] : ""
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.split("T")[0] : ""
  );
  const [labelsInput, setLabelsInput] = useState(
    task?.labels ? task.labels.join(", ") : ""
  );

  // Attachments
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [newAttName, setNewAttName] = useState("");
  const [newAttUrl, setNewAttUrl] = useState("");

  // Comments
  const [comments, setComments] = useState(task?.comments || []);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setSaving(true);
    setError("");

    const labels = labelsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      labels,
      attachments,
    };

    try {
      if (isEditing) {
        const res = await api.put(`/tasks/${task._id}`, payload);
        onSaved(res.data.task);
      } else {
        const res = await api.post(`/tasks/project/${projectId}`, payload);
        onSaved(res.data.task);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task._id}`);
      onDeleted(task._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment(e) {
    e?.preventDefault();
    if (!commentText.trim() || !task?._id) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, { text: commentText.trim() });
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  function addAttachmentItem() {
    if (!newAttUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      {
        name: newAttName.trim() || "Resource Link",
        url: newAttUrl.trim(),
      },
    ]);
    setNewAttName("");
    setNewAttUrl("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? "Task Details & Edit" : "Create New Task"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-700">Task Title *</label>
              <input
                type="text"
                placeholder="e.g. Implement user authentication, Setup MongoDB schema"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                rows={3}
                placeholder="Detailed task description, acceptance criteria, steps..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              />
            </div>

            {/* Status & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee Row */}
            <div>
              <label className="text-xs font-semibold text-slate-700">Assign To Team Member</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m._id || m} value={m._id || m}>
                    {m.name || "Student"} ({m.college || "Team member"})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Labels (comma-separated)
              </label>
              <input
                type="text"
                placeholder="frontend, api, bug, high-priority, auth"
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Paperclip size={13} /> Resource Links & Attachments
              </label>
              <div className="mt-2 space-y-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2 text-xs border border-slate-100"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline truncate max-w-sm"
                    >
                      {att.name}: {att.url}
                    </a>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Link name (e.g. PR #12)"
                    value={newAttName}
                    onChange={(e) => setNewAttName(e.target.value)}
                    className="w-1/3 rounded-xl border border-slate-200 p-2 text-xs outline-none"
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newAttUrl}
                    onChange={(e) => setNewAttUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 p-2 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={addAttachmentItem}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments Section (only for existing tasks) */}
          {isEditing && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare size={14} /> Comments & Activity ({comments.length})
              </h3>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments yet.</p>
                ) : (
                  comments.map((c, idx) => (
                    <div key={idx} className="rounded-xl bg-slate-50 p-2.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1 text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {c.userId?.name || "Member"}
                        </span>
                        <span>
                          {new Date(c.createdAt || Date.now()).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Leave a comment or update on this task..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Comment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/60">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 size={14} /> Delete Task
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Update Task" : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
