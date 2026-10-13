import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderKanban,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Settings,
  Share2,
  Trash2,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  X,
  ShieldAlert,
} from "lucide-react";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import SkillBadges from "../components/SkillBadges.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import KanbanBoard from "../components/KanbanBoard.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { getSkillMatch } from "../utils/skillMatch.js";
import { getSocket } from "../socket.js";

const TABS = [
  { id: "overview", label: "Overview", icon: FolderKanban },
  { id: "team", label: "Team", icon: Users },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "resources", label: "Resources", icon: Paperclip },
  { id: "milestones", label: "Milestones", icon: Award },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const [project, setProject] = useState(null);
  const [me, setMe] = useState(null);
  const [joinRequest, setJoinRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Tab specific data
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [resources, setResources] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Task modal
  const [activeTask, setActiveTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState("todo");

  // Resource modal
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resType, setResType] = useState("other");
  const [resDesc, setResDesc] = useState("");

  // Milestone modal
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDueDate, setMsDueDate] = useState("");
  const [msDesc, setMsDesc] = useState("");

  // Remove member modal
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Transfer ownership modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Embedded chat state
  const [chatConv, setChatConv] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const loadProjectData = useCallback(async () => {
    try {
      const [projectRes, meRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get("/users/me"),
      ]);
      setProject(projectRes.data.project);
      setJoinRequest(projectRes.data.joinRequest);
      setMe(meRes.data.user);

      const isMember = projectRes.data.project.members?.some(
        (m) => (m._id || m).toString() === meRes.data.user._id.toString()
      );

      if (isMember) {
        // Load workspace data
        const wsRes = await api.get(`/projects/${id}/workspace`);
        setTasks(wsRes.data.tasks || []);
        setMilestones(wsRes.data.milestones || []);
        setResources(wsRes.data.resources || []);
        setActivities(wsRes.data.activities || []);
        setPendingRequests(wsRes.data.pendingRequests || []);

        // Load analytics
        api.get(`/analytics/project/${id}`).then((res) => setAnalytics(res.data)).catch(() => {});

        // Load project conversation
        api.get(`/conversations/project/${id}`).then((res) => {
          setChatConv(res.data.conversation);
          if (res.data.conversation?._id) {
            api.get(`/conversations/${res.data.conversation._id}/messages`).then((mRes) => {
              setChatMessages(mRes.data.messages || []);
            });
          }
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadProjectData();
  }, [loadProjectData]);

  // Socket room joining
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !project?._id) return;

    socket.emit("join_project", project._id);

    const handleTaskCreated = (newTask) => setTasks((prev) => [newTask, ...prev]);
    const handleTaskUpdated = (updated) =>
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    const handleTaskDeleted = ({ taskId }) =>
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    const handleActivity = (act) => setActivities((prev) => [act, ...prev.slice(0, 19)]);
    const handleMilestoneUpdated = (ms) =>
      setMilestones((prev) => prev.map((m) => (m._id === ms._id ? ms : m)));
    const handleResourceAdded = (r) => setResources((prev) => [r, ...prev]);

    socket.on("task_created", handleTaskCreated);
    socket.on("task_updated", handleTaskUpdated);
    socket.on("task_deleted", handleTaskDeleted);
    socket.on("new_activity", handleActivity);
    socket.on("milestone_updated", handleMilestoneUpdated);
    socket.on("resource_added", handleResourceAdded);

    return () => {
      socket.emit("leave_project", project._id);
      socket.off("task_created", handleTaskCreated);
      socket.off("task_updated", handleTaskUpdated);
      socket.off("task_deleted", handleTaskDeleted);
      socket.off("new_activity", handleActivity);
      socket.off("milestone_updated", handleMilestoneUpdated);
      socket.off("resource_added", handleResourceAdded);
    };
  }, [project?._id]);

  // Handle embedded chat socket messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatConv?._id) return;

    socket.emit("join_conversation", chatConv._id);

    const handleNewMessage = (msg) => {
      if (msg.conversationId === chatConv._id) {
        setChatMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("new_message", handleNewMessage);
    return () => {
      socket.emit("leave_conversation", chatConv._id);
      socket.off("new_message", handleNewMessage);
    };
  }, [chatConv?._id]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function requestJoin() {
    setActing(true);
    setError("");
    try {
      await api.post(`/projects/${id}/join`);
      await loadProjectData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send join request");
    } finally {
      setActing(false);
    }
  }

  async function deleteProject() {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete project");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  async function leaveProject() {
    setLeaving(true);
    try {
      await api.delete(`/projects/${id}/members/me`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave project");
      setShowLeaveModal(false);
    } finally {
      setLeaving(false);
    }
  }

  async function decideRequest(requestId, decision) {
    try {
      await api.put(`/join-requests/${requestId}/${decision}`);
      await loadProjectData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${decision} request`);
    }
  }

  async function removeMember() {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      await api.delete(`/projects/${id}/members/${memberToRemove._id}`);
      setMemberToRemove(null);
      await loadProjectData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingMember(false);
    }
  }

  async function transferOwnership() {
    if (!transferTargetId) return;
    setTransferring(true);
    try {
      await api.post(`/projects/${id}/transfer-ownership`, { newOwnerId: transferTargetId });
      setShowTransferModal(false);
      await loadProjectData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  }

  async function handleTaskMoved(taskId, newStatus) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      console.error(err);
      loadProjectData();
    }
  }

  async function handleAddResource(e) {
    e.preventDefault();
    if (!resTitle.trim() || !resUrl.trim()) return;
    try {
      const res = await api.post(`/resources/project/${id}`, {
        title: resTitle.trim(),
        url: resUrl.trim(),
        type: resType,
        description: resDesc.trim(),
      });
      setResources((prev) => [res.data.resource, ...prev]);
      setShowResourceModal(false);
      setResTitle("");
      setResUrl("");
      setResDesc("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add resource");
    }
  }

  async function handleDeleteResource(resId) {
    try {
      await api.delete(`/resources/${resId}`);
      setResources((prev) => prev.filter((r) => r._id !== resId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddMilestone(e) {
    e.preventDefault();
    if (!msTitle.trim() || !msDueDate) return;
    try {
      const res = await api.post(`/milestones/project/${id}`, {
        title: msTitle.trim(),
        dueDate: msDueDate,
        description: msDesc.trim(),
      });
      setMilestones((prev) => [...prev, res.data.milestone]);
      setShowMilestoneModal(false);
      setMsTitle("");
      setMsDueDate("");
      setMsDesc("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create milestone");
    }
  }

  async function toggleMilestone(mId, currentStatus) {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const res = await api.put(`/milestones/${mId}`, { status: nextStatus });
      setMilestones((prev) => prev.map((m) => (m._id === mId ? res.data.milestone : m)));
    } catch (err) {
      console.error(err);
    }
  }

  async function sendChatMessage(e) {
    e.preventDefault();
    if (!chatInput.trim() || !chatConv?._id) return;
    try {
      const res = await api.post(`/conversations/${chatConv._id}/messages`, {
        text: chatInput.trim(),
      });
      setChatMessages((prev) => [...prev, res.data.message]);
      setChatInput("");
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <Loader label="Loading project workspace..." />;
  if (!project) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-center text-rose-700">
        {error || "Project not found"}
      </div>
    );
  }

  const myId = me?._id?.toString();
  const ownerId = (project.creatorId?._id || project.creatorId)?.toString();
  const isOwner = Boolean(myId && ownerId && myId === ownerId);
  const isMember = Boolean(
    myId && project.members?.some((m) => (m._id || m)?.toString() === myId)
  );
  const match = getSkillMatch(me?.skills || [], project.requiredSkills || []);
  const existingMembers = project.existingMembersCount || 0;
  const totalMembers = existingMembers + project.members.length;
  const spotsLeft = project.teamSize - totalMembers;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Status Action Header
  let actionComponent = null;
  if (isOwner) {
    actionComponent = (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs">
          👑 Owner
        </span>
        <Link
          to={`/projects/${id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={13} /> Edit
        </Link>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    );
  } else if (isMember) {
    actionComponent = (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs">
          <Check size={14} /> Team Member
        </span>
        <button
          onClick={() => setShowLeaveModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          Leave Team
        </button>
      </div>
    );
  } else if (joinRequest?.status === "pending") {
    actionComponent = (
      <span className="rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800">
        ⏳ Join Request Pending
      </span>
    );
  } else if (joinRequest?.status === "rejected") {
    actionComponent = (
      <div className="flex items-center gap-2">
        <span className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
          Request Rejected
        </span>
        <button
          onClick={requestJoin}
          disabled={acting || !project.isOpen}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {acting ? "Sending..." : "Apply Again"}
        </button>
      </div>
    );
  } else {
    actionComponent = (
      <button
        onClick={requestJoin}
        disabled={acting || !project.isOpen}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {acting ? "Sending..." : project.isOpen ? "Request to Join Team" : "Team is Full"}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete this project?"
          message={`"${project.title}" will be permanently deleted along with all tasks, chat history, resources, and milestones. This cannot be undone.`}
          confirmLabel="Yes, Delete Project"
          onConfirm={deleteProject}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
          danger
        />
      )}

      {showLeaveModal && (
        <ConfirmModal
          title="Leave this project team?"
          message={`You will be removed from "${project.title}" and lose access to the team workspace and private chat.`}
          confirmLabel="Yes, Leave Team"
          onConfirm={leaveProject}
          onCancel={() => setShowLeaveModal(false)}
          loading={leaving}
          danger
        />
      )}

      {/* Remove member confirmation */}
      {memberToRemove && (
        <ConfirmModal
          title={`Remove ${memberToRemove.name}?`}
          message={`Are you sure you want to remove ${memberToRemove.name} from the team? They will lose access to the workspace.`}
          confirmLabel="Remove Member"
          onConfirm={removeMember}
          onCancel={() => setMemberToRemove(null)}
          loading={removingMember}
          danger
        />
      )}

      {/* Transfer ownership modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Transfer Project Ownership</h3>
            <p className="mt-1 text-xs text-slate-500">
              Select an active team member to become the new owner of "{project.title}".
            </p>
            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-700">Select New Owner</label>
              <select
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
              >
                <option value="">Choose a member...</option>
                {project.members
                  .filter((m) => (m._id || m).toString() !== myId)
                  .map((m) => (
                    <option key={m._id || m} value={m._id || m}>
                      {m.name || "Student"} ({m.email})
                    </option>
                  ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={transferOwnership}
                disabled={transferring || !transferTargetId}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Project Header Card ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {project.category}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  project.isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {project.isOpen ? `Open • ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left` : "Closed"}
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 uppercase">
                {project.status || "active"}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{project.title}</h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Created by <strong className="text-slate-800">{project.creatorId?.name || "Student"}</strong>
              {project.creatorId?.college ? ` • ${project.creatorId.college}` : ""}
            </p>
          </div>

          <div className="flex-shrink-0">{actionComponent}</div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </p>
        )}

        {/* Workspace Progress bar */}
        {isMember && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-600" /> Overall Project Progress
              </span>
              <span className="text-indigo-700 font-bold">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px scrollbar-none">
        {TABS.filter((t) => (!t.ownerOnly ? true : isOwner)).map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                isActive
                  ? "border-indigo-600 bg-white text-indigo-700 shadow-xs"
                  : "border-transparent text-slate-500 hover:bg-slate-100/60 hover:text-slate-900"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.id === "tasks" && tasks.length > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600">
                  {tasks.length}
                </span>
              )}
              {tab.id === "team" && pendingRequests.length > 0 && isOwner && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] text-white">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}

      {/* Non-member barrier for internal tabs */}
      {!isMember && currentTab !== "overview" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <ShieldAlert size={40} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Team Members Only</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            You must be an accepted member of "{project.title}" to view tasks, chat with the team, and share resources.
          </p>
          <div className="mt-5">
            {joinRequest?.status === "pending" ? (
              <span className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                Your request is pending owner approval
              </span>
            ) : (
              <button
                onClick={requestJoin}
                disabled={acting || !project.isOpen}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                {acting ? "Sending..." : "Request to Join Team"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* 1. OVERVIEW TAB */}
      {currentTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900">Project Description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {project.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                  <Users size={14} className="text-indigo-600" />
                  {totalMembers}/{project.teamSize} members
                  {existingMembers > 0 && <span className="text-slate-400">({existingMembers} offline)</span>}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                  <Calendar size={14} className="text-indigo-600" />
                  Deadline:{" "}
                  {new Date(project.deadline).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Team Roster Snapshot */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Team Members ({totalMembers})</h2>
                {isMember && (
                  <button
                    onClick={() => setSearchParams({ tab: "team" })}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View All →
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {project.members.map((member) => (
                  <div
                    key={member._id || member}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {member.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {member.name || "Student"}
                        {(member._id || member).toString() === ownerId && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
                            OWNER
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {member.college || member.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* WhatsApp group (team members only) */}
            {isMember && project.whatsappNumber ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs">
                <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                  <Phone size={16} /> Team WhatsApp Group
                </h3>
                <p className="mt-1 text-xs text-emerald-800">{project.whatsappNumber}</p>
                <a
                  href={`https://wa.me/${project.whatsappNumber.replace(/[^\d+]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  Open WhatsApp Group <ExternalLink size={12} />
                </a>
              </div>
            ) : null}

            {/* Skill Match Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Skill Compatibility</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    match.percent >= 70
                      ? "bg-emerald-50 text-emerald-700"
                      : match.percent >= 40
                      ? "bg-amber-50 text-amber-700"
                      : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {match.percent}% Match
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    match.percent >= 70
                      ? "bg-emerald-500"
                      : match.percent >= 40
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }`}
                  style={{ width: `${match.percent}%` }}
                />
              </div>

              {match.matched.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Skills you match
                  </p>
                  <SkillBadges skills={match.matched} tone="emerald" />
                </div>
              )}

              {match.missing.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Skills to learn / missing
                  </p>
                  <SkillBadges skills={match.missing} tone="rose" />
                </div>
              )}
            </div>

            {/* Required Skills */}
            {project.requiredSkills?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Required Tech Stack</h3>
                <SkillBadges skills={project.requiredSkills} />
              </div>
            )}
          </aside>
        </div>
      )}

      {/* 2. TEAM TAB */}
      {isMember && currentTab === "team" && (
        <div className="space-y-6">
          {/* Pending Requests for Owner */}
          {isOwner && pendingRequests.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                <Users size={16} /> Pending Join Applications ({pendingRequests.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">
                          {req.studentId?.name || "Student"}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {req.studentId?.college} {req.studentId?.branch ? `• ${req.studentId.branch}` : ""}
                      </p>
                      {req.studentId?.bio && (
                        <p className="mt-2 text-xs text-slate-600 line-clamp-2 italic">
                          "{req.studentId.bio}"
                        </p>
                      )}
                      {req.studentId?.skills?.length > 0 && (
                        <div className="mt-2">
                          <SkillBadges skills={req.studentId.skills.slice(0, 4)} />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2 border-t pt-3">
                      <button
                        onClick={() => decideRequest(req._id, "accept")}
                        className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Accept Member
                      </button>
                      <button
                        onClick={() => decideRequest(req._id, "reject")}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Members Roster */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Current Team Members</h3>
                <p className="text-xs text-slate-500">
                  {totalMembers} of {project.teamSize} spots filled ({spotsLeft} spots open)
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Transfer Ownership
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.members.map((member) => {
                const memberIsOwner = (member._id || member).toString() === ownerId;
                const canRemove = isOwner && !memberIsOwner;

                return (
                  <div
                    key={member._id || member}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                            {member.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{member.name}</h4>
                            <p className="text-xs text-slate-500">
                              {member.college || member.email}
                            </p>
                          </div>
                        </div>

                        {memberIsOwner && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            OWNER
                          </span>
                        )}
                      </div>

                      {member.skills?.length > 0 && (
                        <div className="mt-3">
                          <SkillBadges skills={member.skills.slice(0, 3)} />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs">
                      <div className="flex gap-3 text-slate-500">
                        {member.github && (
                          <a
                            href={member.github}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-slate-900"
                          >
                            GitHub
                          </a>
                        )}
                        {member.linkedin && (
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-slate-900"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>

                      {canRemove && (
                        <button
                          onClick={() => setMemberToRemove(member)}
                          className="text-[11px] font-semibold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. TASKS TAB (Kanban Board) */}
      {isMember && currentTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Task Board</h3>
              <p className="text-xs text-slate-500">
                Drag and drop cards across columns to update task progress.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTask(null);
                setTaskModalDefaultStatus("todo");
                setShowTaskModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              <Plus size={15} /> Add Task
            </button>
          </div>

          <KanbanBoard
            tasks={tasks}
            members={project.members}
            onTaskClick={(t) => {
              setActiveTask(t);
              setShowTaskModal(true);
            }}
            onAddTask={(colId) => {
              setActiveTask(null);
              setTaskModalDefaultStatus(colId);
              setShowTaskModal(true);
            }}
            onTaskMoved={handleTaskMoved}
          />
        </div>
      )}

      {/* 4. CHAT TAB (Embedded Team Channel) */}
      {isMember && currentTab === "chat" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-[600px]">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600" /> {project.title} Team Channel
              </h3>
              <p className="text-xs text-slate-500">
                Only accepted team members can view and send messages here.
              </p>
            </div>
            <Link
              to={`/chat?id=${chatConv?._id}`}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open Full Chat Screen →
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={32} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No messages in this project channel yet.</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderId?._id === me?._id;
                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {msg.senderId?.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div
                      className={`max-w-[70%] rounded-xl p-3 text-xs ${
                        isMe ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 mb-1 text-[10px] ${
                          isMe ? "text-indigo-200 justify-end" : "text-slate-400"
                        }`}
                      >
                        <span className="font-semibold">{msg.senderId?.name || "Student"}</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Input */}
          <form onSubmit={sendChatMessage} className="border-t border-slate-200 p-3 flex gap-2">
            <input
              type="text"
              placeholder="Send message to team..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* 5. RESOURCES TAB */}
      {isMember && currentTab === "resources" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Project Resources & Links</h3>
              <p className="text-xs text-slate-500">
                Shared repositories, design files, live demos, and documentation.
              </p>
            </div>
            <button
              onClick={() => setShowResourceModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              <Plus size={15} /> Add Resource
            </button>
          </div>

          {resources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Paperclip size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No resources shared yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add your GitHub repo, Figma designs, or project documentation to collaborate easily.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((res) => (
                <div
                  key={res._id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        {res.type}
                      </span>
                      {(isOwner || res.uploadedById?._id === me?._id) && (
                        <button
                          onClick={() => handleDeleteResource(res._id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-slate-900">{res.title}</h4>
                    {res.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{res.description}</p>
                    )}
                  </div>

                  <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      By {res.uploadedById?.name || "Member"}
                    </span>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                    >
                      Open Link <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. MILESTONES TAB */}
      {isMember && currentTab === "milestones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Project Milestones</h3>
              <p className="text-xs text-slate-500">
                Track phase completions and major targets against deadlines.
              </p>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                <Plus size={15} /> Add Milestone
              </button>
            )}
          </div>

          {milestones.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Award size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No milestones configured</p>
              <p className="text-xs text-slate-400 mt-1">
                Break your project into tangible deliverables and targets.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((ms) => {
                const isCompleted = ms.status === "completed";
                return (
                  <div
                    key={ms._id}
                    className={`rounded-xl border p-4 shadow-xs flex items-center justify-between gap-4 transition-colors ${
                      isCompleted
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleMilestone(ms._id, ms.status)}
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg border transition-colors ${
                          isCompleted
                            ? "border-emerald-500 bg-emerald-600 text-white"
                            : "border-slate-300 hover:border-indigo-400"
                        }`}
                      >
                        {isCompleted && <Check size={14} />}
                      </button>
                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isCompleted ? "text-emerald-950 line-through" : "text-slate-900"
                          }`}
                        >
                          {ms.title}
                        </h4>
                        {ms.description && (
                          <p className="mt-0.5 text-xs text-slate-500">{ms.description}</p>
                        )}
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar size={11} /> Target:{" "}
                          {new Date(ms.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ms.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. ACTIVITY TAB */}
      {isMember && currentTab === "activity" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Project Activity Feed</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => (
                <div key={act._id} className="flex items-start gap-3 text-xs border-b pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Clock size={13} />
                  </div>
                  <div>
                    <p className="text-slate-800">
                      <strong>{act.userId?.name || "Member"}</strong>: {act.details || act.action}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. ANALYTICS TAB */}
      {isMember && currentTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Total Tasks</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalTasks}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
              <p className="text-xs font-semibold text-emerald-700">Completed</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{completedTasks}</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-xs">
              <p className="text-xs font-semibold text-indigo-700">Progress</p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">{progressPercent}%</p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-xs">
              <p className="text-xs font-semibold text-purple-700">Milestones Done</p>
              <p className="mt-1 text-2xl font-bold text-purple-900">
                {analytics?.summary?.completedMilestones || 0}/{milestones.length}
              </p>
            </div>
          </div>

          {/* Member Contribution Breakdown */}
          {analytics?.memberContributions?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                Team Member Contributions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-slate-50/60 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Member</th>
                      <th className="p-3">Assigned Tasks</th>
                      <th className="p-3">Completed</th>
                      <th className="p-3">In Progress</th>
                      <th className="p-3">Overdue</th>
                      <th className="p-3">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.memberContributions.map((contrib, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-900">
                          {contrib.member?.name || "Student"}
                        </td>
                        <td className="p-3">{contrib.tasksAssigned}</td>
                        <td className="p-3 text-emerald-700 font-bold">{contrib.tasksCompleted}</td>
                        <td className="p-3 text-blue-700">{contrib.tasksInProgress}</td>
                        <td className="p-3 text-rose-700 font-bold">{contrib.tasksOverdue}</td>
                        <td className="p-3 font-bold text-indigo-700">
                          {contrib.completionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. SETTINGS TAB (Owner only) */}
      {isOwner && currentTab === "settings" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900">Project Management & Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={`/projects/${id}/edit`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
            >
              <Pencil size={20} className="text-indigo-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Edit Project Details</h4>
                <p className="text-[11px] text-slate-500">Change title, description, skills, or deadline</p>
              </div>
            </Link>

            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <UserCheck size={20} className="text-indigo-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Transfer Ownership</h4>
                <p className="text-[11px] text-slate-500">Hand project lead role to another member</p>
              </div>
            </button>
          </div>

          <div className="border-t pt-5">
            <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
              Danger Zone
            </h4>
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <div>
                <p className="text-xs font-bold text-rose-900">Delete this project</p>
                <p className="text-[11px] text-rose-700">
                  Permanently deletes the project, team tasks, milestones, and chat history.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals for Tasks, Resources, Milestones ────────────────── */}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={activeTask}
          projectId={id}
          members={project.members}
          defaultStatus={taskModalDefaultStatus}
          onClose={() => {
            setShowTaskModal(false);
            setActiveTask(null);
          }}
          onSaved={(savedTask) => {
            setTasks((prev) => {
              const idx = prev.findIndex((t) => t._id === savedTask._id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = savedTask;
                return updated;
              }
              return [savedTask, ...prev];
            });
          }}
          onDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t._id !== deletedId));
          }}
        />
      )}

      {/* Add Resource Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Shared Resource</h3>
            <form onSubmit={handleAddResource} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. GitHub Repository, Figma Mockups, Swagger API"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">URL *</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Resource Type</label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                >
                  <option value="github">GitHub</option>
                  <option value="docs">Documentation</option>
                  <option value="figma">Figma / Design</option>
                  <option value="demo">Live Demo</option>
                  <option value="api">API Specs</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief note on what this resource contains..."
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Add Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Project Milestone</h3>
            <form onSubmit={handleAddMilestone} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Milestone Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Phase 1 Prototype, Database Migration, Beta Release"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Target Due Date *</label>
                <input
                  type="date"
                  value={msDueDate}
                  onChange={(e) => setMsDueDate(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Deliverables included in this milestone..."
                  value={msDesc}
                  onChange={(e) => setMsDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
