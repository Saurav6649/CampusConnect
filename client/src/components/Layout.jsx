import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { UserButton, useAuth } from "@clerk/clerk-react";
import {
  CheckSquare,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Plus,
  User,
  Bell,
  Sparkles,
} from "lucide-react";
import NotificationBell from "./NotificationBell.jsx";
import { connectSocket, disconnectSocket } from "../socket.js";
import api from "../api/client.js";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { to: "/chat", label: "Team Chat", icon: MessageSquare },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Layout() {
  const { getToken, isSignedIn } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isSignedIn) {
      getToken().then((token) => {
        if (token) {
          connectSocket(token);
        }
      });
    }
    return () => {
      // Don't disconnect on route changes, only on full unmount
    };
  }, [isSignedIn, getToken]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <header className="glass-header sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5 font-bold text-slate-900 group">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition-transform group-hover:scale-105">
                <GraduationCap size={20} />
              </span>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900">CampusConnect</span>
                <span className="text-[10px] -mt-1 font-semibold uppercase tracking-wider text-indigo-600">Student Hub</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/projects"}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/projects/create"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} /> Create Project
            </Link>
            <NotificationBell />
            <div className="border-l border-slate-200 pl-2">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2 md:hidden bg-white/95">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/projects"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors min-w-[60px] ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} CampusConnect — Student Collaboration & Project Management</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Real-time Chat</span>
            <span>•</span>
            <span>Task Kanban</span>
            <span>•</span>
            <span>Skill Matching</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
