import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FolderKanban,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  Trash2,
  Edit2,
  Reply,
  X,
  ExternalLink,
  Users,
} from "lucide-react";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { getSocket } from "../socket.js";

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeParamId = searchParams.get("id");

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [me, setMe] = useState(null);

  // Message input state
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  // New DM modal state
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load current user profile & conversation list
  const loadConversations = useCallback(async () => {
    try {
      const [meRes, convRes] = await Promise.all([
        api.get("/users/me"),
        api.get("/conversations"),
      ]);
      setMe(meRes.data.user);
      const convs = convRes.data.conversations || [];
      setConversations(convs);

      // Select active conversation
      if (activeParamId) {
        const found = convs.find((c) => c._id === activeParamId);
        if (found) setActiveConv(found);
      } else if (convs.length > 0 && !activeConv) {
        setActiveConv(convs[0]);
        setSearchParams({ id: convs[0]._id }, { replace: true });
      }
    } catch (err) {
      console.error("Load conversations error:", err);
    } finally {
      setLoadingConv(false);
    }
  }, [activeParamId, setSearchParams]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever activeConv changes
  useEffect(() => {
    if (!activeConv) return;

    setLoadingMessages(true);
    api
      .get(`/conversations/${activeConv._id}/messages`)
      .then((res) => {
        setMessages(res.data.messages || []);
        scrollToBottom();
      })
      .catch((err) => console.error("Load messages error:", err))
      .finally(() => setLoadingMessages(false));

    // Mark as read on backend
    api.post(`/conversations/${activeConv._id}/read`).catch(() => {});

    // Clear unread count locally
    setConversations((prev) =>
      prev.map((c) => (c._id === activeConv._id ? { ...c, unreadCount: 0 } : c))
    );

    // Join conversation room in socket
    const socket = getSocket();
    if (socket) {
      socket.emit("join_conversation", activeConv._id);
    }

    return () => {
      if (socket) {
        socket.emit("leave_conversation", activeConv._id);
      }
    };
  }, [activeConv]);

  // Socket event listeners for real-time messaging
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (activeConv && msg.conversationId === activeConv._id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
        // Mark as read
        api.post(`/conversations/${activeConv._id}/read`).catch(() => {});
      } else {
        // Increment unread count for other conversation
        setConversations((prev) =>
          prev.map((c) =>
            c._id === msg.conversationId
              ? {
                  ...c,
                  unreadCount: (c.unreadCount || 0) + 1,
                  lastMessage: {
                    text: msg.text || "Attachment",
                    sentAt: msg.createdAt,
                  },
                }
              : c
          )
        );
      }
    };

    const handleEdited = (msg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? msg : m))
      );
    };

    const handleDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, text: "This message was deleted", attachments: [] }
            : m
        )
      );
    };

    const handleUserTyping = ({ conversationId, user }) => {
      if (activeConv && conversationId === activeConv._id) {
        setTypingUsers((prev) =>
          prev.some((u) => u._id === user._id) ? prev : [...prev, user]
        );
      }
    };

    const handleUserStoppedTyping = ({ conversationId, userId }) => {
      if (activeConv && conversationId === activeConv._id) {
        setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleEdited);
    socket.on("message_deleted", handleDeleted);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
    };
  }, [activeConv]);

  // Handle typing indicator trigger
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const socket = getSocket();
    if (!socket || !activeConv) return;

    socket.emit("typing_start", { conversationId: activeConv._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId: activeConv._id });
    }, 2000);
  };

  // Send message
  async function sendMessage(e) {
    e?.preventDefault();
    if (!inputText.trim() && attachmentsList.length === 0) return;
    if (!activeConv) return;

    try {
      const payload = {
        text: inputText.trim(),
        attachments: attachmentsList,
        replyTo: replyingTo?._id || null,
      };

      const res = await api.post(`/conversations/${activeConv._id}/messages`, payload);
      // Append if not already received via socket
      setMessages((prev) =>
        prev.some((m) => m._id === res.data.message._id) ? prev : [...prev, res.data.message]
      );
      setInputText("");
      setAttachmentsList([]);
      setReplyingTo(null);
      scrollToBottom();

      const socket = getSocket();
      if (socket) {
        socket.emit("typing_stop", { conversationId: activeConv._id });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  // Edit message
  async function saveEditMessage(id) {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/conversations/messages/${id}`, { text: editText.trim() });
      setMessages((prev) => prev.map((m) => (m._id === id ? res.data.message : m)));
      setEditingMessageId(null);
      setEditText("");
    } catch (err) {
      console.error(err);
    }
  }

  // Delete message
  async function deleteMessage(id) {
    try {
      await api.delete(`/conversations/messages/${id}`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id
            ? { ...m, isDeleted: true, text: "This message was deleted", attachments: [] }
            : m
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  // Add attachment link
  function addAttachment() {
    if (!attachmentUrl.trim()) return;
    setAttachmentsList((prev) => [
      ...prev,
      {
        name: attachmentName.trim() || "Resource link",
        url: attachmentUrl.trim(),
        fileType: "link",
      },
    ]);
    setAttachmentName("");
    setAttachmentUrl("");
    setShowAttachmentModal(false);
  }

  // Search users for new DM
  useEffect(() => {
    if (!userQuery.trim() || userQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(userQuery)}`);
        setSearchResults(res.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [userQuery]);

  // Start direct message
  async function startDirectMessage(recipientId) {
    try {
      const res = await api.post("/conversations/direct", { recipientId });
      const conv = res.data.conversation;
      setShowNewDmModal(false);
      setUserQuery("");

      // Add to list if missing
      setConversations((prev) => {
        if (prev.some((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });

      setActiveConv(conv);
      setSearchParams({ id: conv._id });
    } catch (err) {
      console.error(err);
    }
  }

  // Group conversations into projects and DMs
  const filteredConversations = conversations.filter((c) => {
    const title =
      c.type === "project"
        ? c.projectId?.title || c.title || ""
        : c.participants?.find((p) => p._id !== me?._id)?.name || "";
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const projectChannels = filteredConversations.filter((c) => c.type === "project");
  const directMessages = filteredConversations.filter((c) => c.type === "direct");

  if (loadingConv) return <Loader label="Loading conversations..." />;

  // Format recipient title for direct conversation
  const getConversationTitle = (conv) => {
    if (!conv) return "";
    if (conv.type === "project") {
      return conv.projectId?.title || conv.title || "Project Channel";
    }
    const other = conv.participants?.find((p) => p._id !== me?._id);
    return other?.name || "Direct Message";
  };

  const getConversationSubtitle = (conv) => {
    if (!conv) return "";
    if (conv.type === "project") {
      return `${conv.projectId?.category || "Project"} • ${conv.participants?.length || 0} members`;
    }
    const other = conv.participants?.find((p) => p._id !== me?._id);
    return other?.college || other?.branch || "Student";
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* ── Left Sidebar ────────────────────────────────────────────── */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/50">
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200/80 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-600" /> Messages
            </h2>
            <button
              onClick={() => setShowNewDmModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
              title="New Direct Message"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Project channels */}
          <div>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Project Channels ({projectChannels.length})
            </p>
            {projectChannels.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400 italic">No project channels</p>
            ) : (
              <div className="space-y-1">
                {projectChannels.map((conv) => {
                  const isSelected = activeConv?._id === conv._id;
                  return (
                    <button
                      key={conv._id}
                      onClick={() => {
                        setActiveConv(conv);
                        setSearchParams({ id: conv._id });
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                          isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        <FolderKanban size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-semibold">
                            {conv.projectId?.title || conv.title}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                isSelected ? "bg-white text-indigo-700" : "bg-rose-500 text-white"
                              }`}
                            >
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p
                          className={`truncate text-[11px] ${
                            isSelected ? "text-indigo-100" : "text-slate-400"
                          }`}
                        >
                          {conv.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Direct Messages ({directMessages.length})
              </p>
              <button
                onClick={() => setShowNewDmModal(true)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                + New
              </button>
            </div>
            {directMessages.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400 italic">No direct chats yet</p>
            ) : (
              <div className="space-y-1">
                {directMessages.map((conv) => {
                  const isSelected = activeConv?._id === conv._id;
                  const otherUser = conv.participants?.find((p) => p._id !== me?._id);
                  return (
                    <button
                      key={conv._id}
                      onClick={() => {
                        setActiveConv(conv);
                        setSearchParams({ id: conv._id });
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-semibold">
                            {otherUser?.name || "Direct Message"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                isSelected ? "bg-white text-indigo-700" : "bg-rose-500 text-white"
                              }`}
                            >
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p
                          className={`truncate text-[11px] ${
                            isSelected ? "text-indigo-100" : "text-slate-400"
                          }`}
                        >
                          {conv.lastMessage?.text || "Started conversation"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ───────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col bg-white">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                  {activeConv.type === "project" ? (
                    <FolderKanban size={20} />
                  ) : (
                    activeConv.participants
                      ?.find((p) => p._id !== me?._id)
                      ?.name?.charAt(0)
                      ?.toUpperCase() || "?"
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-900">
                    {getConversationTitle(activeConv)}
                  </h3>
                  <p className="truncate text-xs text-slate-500">
                    {getConversationSubtitle(activeConv)}
                  </p>
                </div>
              </div>

              {activeConv.type === "project" && activeConv.projectId?._id && (
                <Link
                  to={`/projects/${activeConv.projectId._id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Project Workspace <ExternalLink size={12} />
                </Link>
              )}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingMessages ? (
                <Loader label="Loading messages..." />
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare size={36} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Be the first to say hello to the team or share a resource link!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId?._id === me?._id;
                  const isEditing = editingMessageId === msg._id;

                  return (
                    <div
                      key={msg._id}
                      className={`group flex items-start gap-3 ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isMe
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {msg.senderId?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[75%] rounded-2xl p-3 shadow-xs ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/60"
                        }`}
                      >
                        {/* Sender info */}
                        <div
                          className={`flex items-center gap-2 mb-1 text-[10px] ${
                            isMe ? "text-indigo-200 justify-end" : "text-slate-500"
                          }`}
                        >
                          <span className="font-semibold">{msg.senderId?.name || "Student"}</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.isEdited && <span className="italic">(edited)</span>}
                        </div>

                        {/* Reply-to quote */}
                        {msg.replyTo && (
                          <div
                            className={`mb-2 rounded-lg p-2 text-xs border-l-2 ${
                              isMe
                                ? "bg-indigo-700/60 border-white text-indigo-100"
                                : "bg-white border-indigo-500 text-slate-600"
                            }`}
                          >
                            <span className="font-semibold block text-[10px]">
                              Replying to {msg.replyTo.senderId?.name || "message"}
                            </span>
                            <p className="truncate line-clamp-1">{msg.replyTo.text}</p>
                          </div>
                        )}

                        {/* Edit mode or message content */}
                        {isEditing ? (
                          <div className="space-y-2 mt-1">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full rounded-lg bg-white px-2 py-1 text-xs text-slate-900 outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEditMessage(msg._id)}
                                className="rounded px-2 py-0.5 text-[10px] bg-white text-indigo-700 font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="rounded px-2 py-0.5 text-[10px] bg-white/20 text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={`whitespace-pre-wrap text-xs sm:text-sm leading-relaxed ${
                              msg.isDeleted ? "italic opacity-60" : ""
                            }`}
                          >
                            {msg.text}
                          </p>
                        )}

                        {/* Attachments */}
                        {msg.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 rounded-lg p-1.5 text-xs underline underline-offset-2 ${
                                  isMe
                                    ? "bg-indigo-700/50 text-white hover:bg-indigo-700"
                                    : "bg-white text-indigo-600 hover:bg-slate-50"
                                }`}
                              >
                                <Paperclip size={12} />
                                <span className="truncate">{att.name}</span>
                                <ExternalLink size={10} className="ml-auto" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Hover Actions (Reply, Edit, Delete) */}
                        {!msg.isDeleted && !isEditing && (
                          <div
                            className={`mt-1.5 flex items-center gap-2 pt-1 border-t opacity-0 group-hover:opacity-100 transition-opacity ${
                              isMe ? "border-indigo-500/50 justify-end" : "border-slate-200"
                            }`}
                          >
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className={`text-[10px] flex items-center gap-1 ${
                                isMe ? "text-indigo-200 hover:text-white" : "text-slate-500 hover:text-slate-800"
                              }`}
                              title="Reply"
                            >
                              <Reply size={11} /> Reply
                            </button>
                            {isMe && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(msg._id);
                                    setEditText(msg.text);
                                  }}
                                  className="text-[10px] flex items-center gap-1 text-indigo-200 hover:text-white"
                                  title="Edit"
                                >
                                  <Edit2 size={11} /> Edit
                                </button>
                                <button
                                  onClick={() => deleteMessage(msg._id)}
                                  className="text-[10px] flex items-center gap-1 text-rose-200 hover:text-white"
                                  title="Delete"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs italic text-slate-400">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]" />
                  </div>
                  <span>
                    {typingUsers.map((u) => u.name).join(", ")}{" "}
                    {typingUsers.length === 1 ? "is" : "are"} typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-200 p-3 sm:p-4 bg-white">
              {/* Reply preview banner */}
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2 truncate">
                    <Reply size={13} className="text-indigo-600" />
                    <span>
                      Replying to <strong>{replyingTo.senderId?.name}</strong>:{" "}
                      <span className="italic">{replyingTo.text}</span>
                    </span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Attachment chip preview */}
              {attachmentsList.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachmentsList.map((att, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                    >
                      <Paperclip size={12} /> {att.name}
                      <button
                        onClick={() =>
                          setAttachmentsList((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Attach link or resource"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Type your message... (press Enter to send)"
                  value={inputText}
                  onChange={handleInputChange}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && attachmentsList.length === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare size={48} className="text-slate-200 mb-3" />
            <h3 className="text-lg font-semibold text-slate-800">Select a conversation</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              Choose an active project channel from the sidebar or start a new direct message with a peer.
            </p>
          </div>
        )}
      </section>

      {/* ── Attachment Modal ─────────────────────────────────────────── */}
      {showAttachmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Resource or File Link</h3>
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Link Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Design Specs, GitHub repo, Drive folder"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Resource URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={addAttachment}
                disabled={!attachmentUrl.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Direct Message Modal ─────────────────────────────────── */}
      {showNewDmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">New Direct Message</h3>
              <button
                onClick={() => setShowNewDmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="pt-4 space-y-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, email, or skill..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 pl-9 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {searchingUsers ? (
                  <p className="py-4 text-center text-xs text-slate-400">Searching directory...</p>
                ) : searchResults.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    {userQuery.length > 1
                      ? "No students found matching your search."
                      : "Type at least 2 characters to search peers."}
                  </p>
                ) : (
                  searchResults.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => startDirectMessage(u._id)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {u.college || u.email}
                            {u.branch ? ` • ${u.branch}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600">Chat →</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
