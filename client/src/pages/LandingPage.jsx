import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Paperclip,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* ── 1. STICKY NAVBAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Campus<span className="text-indigo-600">Connect</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="transition-colors hover:text-indigo-600">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-indigo-600">
              How It Works
            </a>
            <a href="#showcase" className="transition-colors hover:text-indigo-600">
              Platform Preview
            </a>
            <a href="#use-cases" className="transition-colors hover:text-indigo-600">
              Use Cases
            </a>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            <SignedIn>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              >
                <LayoutDashboard size={14} /> Open Workspace
              </Link>
            </SignedIn>

            <SignedOut>
              <Link
                to="/sign-in"
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              >
                Get Started Free <ArrowRight size={13} />
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION (Split Hero + Floating Dashboard Stage) ── */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28">
        {/* Subtle Ambient Radial Lighting Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-24 left-1/4 w-[540px] h-[540px] rounded-full bg-gradient-to-tr from-indigo-200/35 via-purple-200/25 to-pink-100/20 blur-3xl animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-bl from-purple-200/30 via-indigo-100/25 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* ── LEFT COLUMN: Content & CTAs ── */}
            <div className="lg:col-span-6 flex flex-col justify-center text-left">
              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs backdrop-blur-xs w-fit mb-6 transition-all hover:border-indigo-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-2xs">
                  <Sparkles size={11} />
                </span>
                <span className="text-slate-700 font-medium">
                  The All-in-One Student Collaboration Platform
                </span>
                <span className="text-indigo-600 font-bold">✦</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black tracking-tight text-slate-950 leading-[1.08]">
                Turn campus ideas into{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  shipped projects.
                </span>
              </h1>

              {/* Supporting Description */}
              <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600 font-normal max-w-xl">
                Bring your student teams, project tasks, conversations, resources, and meetings together in one collaborative workspace.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <SignedOut>
                  <Link
                    to="/sign-up"
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Start Collaborating Free <ArrowRight size={16} />
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Go to Your Dashboard <ArrowRight size={16} />
                  </Link>
                </SignedIn>

                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-200"
                >
                  <Search size={15} className="text-indigo-600" /> Explore Open Projects
                </Link>
              </div>

              {/* Social Proof Metric Row */}
              <div className="mt-10 pt-6 border-t border-slate-200/70 flex flex-wrap items-center gap-6 sm:gap-8 text-xs text-slate-600">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    1,500+
                  </div>
                  <div className="text-slate-500 font-medium mt-0.5">Student Builders</div>
                </div>
                <div className="h-8 w-px bg-slate-200/80" />
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    450+
                  </div>
                  <div className="text-slate-500 font-medium mt-0.5">Campus Projects</div>
                </div>
                <div className="h-8 w-px bg-slate-200/80" />
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    98%
                  </div>
                  <div className="text-slate-500 font-medium mt-0.5">Sprint Delivery Rate</div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Interactive Floating Dashboard Stage ── */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              {/* Decorative Subtle Orbit / Stage Rings */}
              <div className="absolute -inset-4 sm:-inset-6 rounded-3xl border border-indigo-100/60 pointer-events-none -z-10 hidden sm:block" />
              <div className="absolute -inset-10 sm:-inset-12 rounded-[2.5rem] border border-purple-50/70 pointer-events-none -z-20 hidden md:block" />

              {/* ── MAIN DASHBOARD CONTAINER ── */}
              <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-15px_rgba(79,70,229,0.14)] overflow-hidden transition-all duration-300 hover:shadow-[0_25px_65px_-12px_rgba(79,70,229,0.18)]">
                {/* Browser-style Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                    </div>
                    <span className="ml-2 hidden sm:inline-block font-mono text-[10px] text-slate-400 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/70">
                      campusconnect.edu/workspaces/autonomous-rover
                    </span>
                  </div>

                  {/* Pulsing Live Collaboration Indicator */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>Live Team Sync</span>
                  </div>
                </div>

                {/* Dashboard Body (Sidebar + Content Workspace) */}
                <div className="grid grid-cols-12 min-h-[380px] sm:min-h-[420px] text-left">
                  {/* Mini Sidebar */}
                  <div className="col-span-4 border-r border-slate-100 bg-slate-50/50 p-3 sm:p-4 space-y-3.5 flex flex-col justify-between">
                    <div>
                      {/* Project Header */}
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Active Project
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
                          Autonomous Rover AI
                        </h3>
                        <span className="inline-block mt-1 rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                          Robotics & ML
                        </span>
                      </div>

                      {/* Navigation Channels */}
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="rounded-xl bg-indigo-600 px-2.5 py-1.5 text-white font-bold flex items-center justify-between shadow-2xs">
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <FolderKanban size={13} /> Board
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                        <div className="rounded-xl px-2.5 py-1.5 text-slate-600 font-medium flex items-center justify-between hover:bg-slate-100/70 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare size={13} /> Team Chat
                          </span>
                          <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700">
                            3
                          </span>
                        </div>
                        <div className="rounded-xl px-2.5 py-1.5 text-slate-600 font-medium flex items-center gap-1.5 hover:bg-slate-100/70 text-[11px]">
                          <Video size={13} /> Google Meet
                        </div>
                        <div className="rounded-xl px-2.5 py-1.5 text-slate-600 font-medium flex items-center gap-1.5 hover:bg-slate-100/70 text-[11px]">
                          <Paperclip size={13} /> Resources
                        </div>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="border-t border-slate-200/70 pt-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Team Roster (4/5)
                      </span>
                      <div className="mt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-[9px]">
                              A
                            </div>
                            <span className="font-semibold text-slate-800 truncate max-w-[65px] sm:max-w-[85px]">
                              Aarav (Lead)
                            </span>
                          </div>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-[9px]">
                              P
                            </div>
                            <span className="font-semibold text-slate-800 truncate max-w-[65px] sm:max-w-[85px]">
                              Pooja (CV)
                            </span>
                          </div>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-[9px]">
                              R
                            </div>
                            <span className="font-semibold text-slate-800 truncate max-w-[65px] sm:max-w-[85px]">
                              Rohan
                            </span>
                          </div>
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Canvas (Meetings + Kanban Columns + Chat preview) */}
                  <div className="col-span-8 p-3 sm:p-4 space-y-3 bg-white flex flex-col justify-between">
                    {/* Google Meet Scheduled Call Card */}
                    <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white flex-shrink-0 shadow-xs">
                          <Video size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[8px] font-bold text-emerald-800">
                              Today
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">4:30 PM (30m)</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            Sprint Demo & Code Review
                          </h4>
                        </div>
                      </div>
                      <a
                        href="https://meet.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 flex-shrink-0"
                      >
                        Join
                      </a>
                    </div>

                    {/* Mini Kanban Board */}
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      {/* Col 1: To Do */}
                      <div className="rounded-xl bg-slate-50/80 p-2 border border-slate-200/70 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1.5">
                            <span>To Do</span>
                            <span className="rounded bg-slate-200 px-1 text-[9px]">1</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-slate-200/80 shadow-2xs space-y-1">
                            <span className="rounded bg-rose-50 px-1 py-0.2 text-[8px] font-bold text-rose-700">
                              HIGH
                            </span>
                            <p className="text-[10px] font-bold text-slate-800 leading-tight">
                              LiDAR Calibration
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium mt-1">Rohan</span>
                      </div>

                      {/* Col 2: In Progress */}
                      <div className="rounded-xl bg-indigo-50/30 p-2 border border-indigo-200/70 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 mb-1.5">
                            <span>In Progress</span>
                            <span className="rounded bg-indigo-100 px-1 text-[9px]">1</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-indigo-200 shadow-2xs space-y-1 ring-1 ring-indigo-50">
                            <span className="rounded bg-indigo-50 px-1 py-0.2 text-[8px] font-bold text-indigo-700">
                              URGENT
                            </span>
                            <p className="text-[10px] font-bold text-slate-900 leading-tight">
                              YOLOv8 Model
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] text-indigo-600 font-medium mt-1">Pooja</span>
                      </div>

                      {/* Col 3: Done */}
                      <div className="rounded-xl bg-emerald-50/30 p-2 border border-emerald-200/70 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 mb-1.5">
                            <span>Done</span>
                            <span className="rounded bg-emerald-100 px-1 text-[9px]">2</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs space-y-1">
                            <span className="rounded bg-emerald-100 px-1 py-0.2 text-[8px] font-bold text-emerald-800">
                              DONE
                            </span>
                            <p className="text-[10px] font-bold text-slate-700 line-through leading-tight">
                              Motor PCB
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] text-emerald-600 font-medium mt-1">Aarav</span>
                      </div>
                    </div>

                    {/* Chat Snippet Bar */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="h-5 w-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                          P
                        </div>
                        <span className="font-semibold text-slate-800 flex-shrink-0">Pooja:</span>
                        <span className="text-slate-600 truncate">
                          "Model weights pushed to GitHub Resources tab!"
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 flex-shrink-0">Just now</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── FLOATING SATELLITE CARDS (Signature Layered Design) ── */}

              {/* Floating Card 1: Task Completed Notification (Top Right) */}
              <div className="absolute -top-5 -right-3 sm:-right-6 hidden sm:flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md animate-float-slow z-20">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-2xs flex-shrink-0">
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">
                    Task Completed
                  </div>
                  <div className="text-[10px] text-slate-500">
                    YOLOv8 Model Deployed by Pooja
                  </div>
                </div>
              </div>

              {/* Floating Card 2: Sprint Progress Widget (Bottom Left) */}
              <div className="absolute -bottom-6 -left-3 sm:-left-6 hidden sm:flex flex-col gap-1.5 rounded-2xl border border-indigo-100 bg-white/95 p-3.5 shadow-xl backdrop-blur-md animate-float-delayed z-20 w-44">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                    <Rocket size={11} /> Sprint 2
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-900">78%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 w-[78%]" />
                </div>
                <span className="text-[9px] text-slate-500 font-medium">
                  14 of 18 deliverables closed
                </span>
              </div>

              {/* Floating Card 3: Teammate Joined (Bottom Right) */}
              <div className="absolute bottom-12 -right-4 sm:-right-8 hidden md:flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md animate-float-slow z-20">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex-shrink-0">
                  A
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-900 leading-tight">
                    New Teammate Joined
                  </div>
                  <div className="text-[9px] text-slate-500">
                    Aarav • Lead Architect
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. PROBLEM VS SOLUTION ───────────────────────────────────── */}
      <section className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              The Reality Check
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Why student projects fall apart — and how we fix it.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Every semester, thousands of ambitious ideas stall before submission day because communication and task management are completely fragmented.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Broken Way */}
            <div className="rounded-3xl border border-rose-200/80 bg-rose-50/30 p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 mb-6">
                  ❌ The Frustrating Old Way
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Chaos across 5 disconnected apps
                </h3>
                <ul className="space-y-4 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-rose-500 font-bold">✕</span>
                    <span>
                      <strong>Burying links in WhatsApp:</strong> Critical GitHub PRs and Figma mockups get drowned out by endless casual chat messages.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-rose-500 font-bold">✕</span>
                    <span>
                      <strong>Ghosting teammates:</strong> Unclear ownership leads to forgotten tasks, missed sprint deadlines, and last-night panic.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-rose-500 font-bold">✕</span>
                    <span>
                      <strong>Ad-hoc video syncs:</strong> Constant back-and-forth asking "Can someone share the Meet link?" whenever teammates need to debug.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-rose-500 font-bold">✕</span>
                    <span>
                      <strong>Random recruiting:</strong> Posting generic messages in university groups with zero visibility into applicants' actual skills or portfolio.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 rounded-2xl bg-white p-4 border border-rose-100 text-xs text-rose-700 font-medium">
                Result: Unfinished prototypes, frustrated teammates, and lost hackathon opportunities.
              </div>
            </div>

            {/* The CampusConnect Way */}
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-8 shadow-md shadow-indigo-500/5 flex flex-col justify-between ring-1 ring-indigo-500/10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white mb-6">
                  ✨ The CampusConnect Standard
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  One purpose-built engineering workspace
                </h3>
                <ul className="space-y-4 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                    <span>
                      <strong>Dedicated Project Rooms:</strong> Real-time messaging restricted to authorized teammates, with integrated links and file vaults.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                    <span>
                      <strong>Drag-and-Drop Kanban:</strong> Instant accountability with status columns, assigned collaborators, and target deadlines.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                    <span>
                      <strong>Google Meet Standup Hub:</strong> Instant sync scheduling with one-click link generation, reminders, and calendar coordination.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                    <span>
                      <strong>Skill-Matched Applications:</strong> Smart percentage match scores based on real profiles, GitHub, and required tech stacks.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 rounded-2xl bg-indigo-600 p-4 text-xs text-white font-medium shadow-md shadow-indigo-600/20">
                Result: Rapid sprints, accountable teammates, and high-quality portfolio-ready projects.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. 8 CORE FEATURES GRID ──────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Core Capabilities
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Everything student engineering teams need to thrive.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Built with industry-grade architectural patterns to simulate professional software engineering workflows.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Real-Time Team Chat</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Project-specific channels with instant Socket.IO message delivery, active typing indicators, unread badges, and a slide-out team roster.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-4">
                <FolderKanban size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Interactive Kanban</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Visual workflow with drag-and-drop cards across To Do, In Progress, Review, and Completed. Assign members and track deadlines.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                <Video size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Google Meet Standups</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Coordinate team syncs with Google Meet links, countdown timers, quick link helpers, copy buttons, and automated teammate notifications.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-4">
                <Paperclip size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero-Duplication Vault</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Centralize GitHub repositories, Figma prototypes, live demos, and API specifications with rock-solid server-side deduplication.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                <Sparkles size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Smart Skill Matching</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Algorithms analyze required skills against student profiles, calculating match percentages so leads find the perfect engineers quickly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-4">
                <Award size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Sprint Milestones</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Deconstruct semester targets into verifiable deliverables. Track completion status with automated progress percentages.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 mb-4">
                <Search size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Search & Discovery</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Filter campus projects by engineering domains: Web, AI/ML, Mobile, Web3, IoT, UI/UX, or open recruitment status.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Role-Based Security</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Strict server authorization guards private chat rooms and task updates. Transfer ownership, accept applicants, and remove members safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Simple 4-Step Process
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              From idea pitch to final semester demo.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              CampusConnect streamlines your journey through every phase of project execution.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Post or Discover</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Create a project specifying your tech stack, category, and target team size, or search existing projects matching your personal skills.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Form Your Team</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Interested students apply with their profiles. Owners review verified skills, bio, GitHub, and LinkedIn before accepting members.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Execute in Real Time</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Collaborate in the private team channel, move tasks across the Kanban board, and hop on Google Meet for standup syncs.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900">Ship & Showcase</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Complete milestones, store demo links and repos in the Resource Vault, and showcase your finished project on your public profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. TABBED LIVE PLATFORM SHOWCASE ─────────────────────────── */}
      <section id="showcase" className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Interactive Preview
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Experience the integrated workspace.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Click through the modules to see how CampusConnect centralizes communication, execution, and video standups.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "chat", label: "Team Messaging", icon: MessageSquare },
              { id: "kanban", label: "Kanban Board", icon: FolderKanban },
              { id: "meet", label: "Google Meet", icon: Video },
              { id: "vault", label: "Resource Vault", icon: Paperclip },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Interactive Showcase Box */}
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900"># Smart Campus IoT Team</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">Socket.IO Real-Time Room</span>
                </div>
                <div className="space-y-3 py-2">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                      S
                    </div>
                    <div className="rounded-2xl rounded-tl-none bg-slate-100 p-3 text-xs max-w-md">
                      <p className="font-semibold text-slate-800">Siddharth (Backend)</p>
                      <p className="text-slate-600 mt-0.5">
                        Added the MQTT broker endpoint to our shared resources tab!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      Y
                    </div>
                    <div className="rounded-2xl rounded-tr-none bg-indigo-600 text-white p-3 text-xs max-w-md">
                      <p className="font-semibold text-indigo-100">You</p>
                      <p className="mt-0.5">
                        Awesome! Connecting the sensor simulator right now. Let's sync on Google Meet at 5.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "kanban" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 text-xs">
                  <span className="font-bold text-slate-900">Sprint 2 • Task Board</span>
                  <span className="text-indigo-600 font-semibold">+ Add Task</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-slate-50 p-3 space-y-2 border border-slate-200/80">
                    <span className="text-xs font-bold text-slate-700">To Do</span>
                    <div className="rounded-lg bg-white p-3 border shadow-2xs text-xs">
                      <p className="font-bold text-slate-900">Configure Redis cache</p>
                      <span className="text-[10px] text-slate-400">Due in 2 days</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 space-y-2 border border-indigo-200">
                    <span className="text-xs font-bold text-indigo-700">In Progress</span>
                    <div className="rounded-lg bg-white p-3 border border-indigo-200 shadow-2xs text-xs">
                      <p className="font-bold text-slate-900">Firmware Over-The-Air Update</p>
                      <span className="text-[10px] text-indigo-600 font-semibold">Assigned: Nikhil</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 space-y-2 border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-700">Completed</span>
                    <div className="rounded-lg bg-white p-3 border border-emerald-200 shadow-2xs text-xs">
                      <p className="font-bold text-slate-900 line-through">Schema Design & Seed</p>
                      <span className="text-[10px] text-emerald-600 font-semibold">Done</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "meet" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 text-xs">
                  <span className="font-bold text-slate-900">Upcoming Video Meetings</span>
                  <span className="text-xs font-semibold text-indigo-600">+ Schedule Meeting</span>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        ● Scheduled
                      </span>
                      <span className="text-xs font-semibold text-slate-600">30 mins</span>
                    </div>
                    <h4 className="mt-2 text-base font-bold text-slate-900">
                      Mid-Semester Progress Presentation Review
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      meet.google.com/qrs-tuvw-xyz • Host: Ananya (Team Lead)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Copy Link
                    </button>
                    <a
                      href="https://meet.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      Join Google Meet
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "vault" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 text-xs">
                  <span className="font-bold text-slate-900">Project Resources & Architecture Specs</span>
                  <span className="text-xs font-semibold text-indigo-600">+ Add Resource</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3.5 space-y-1 text-xs">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                      GITHUB
                    </span>
                    <h5 className="font-bold text-slate-900">Frontend React Repo</h5>
                    <p className="text-slate-500 text-[11px]">Vite + Tailwind source code</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3.5 space-y-1 text-xs">
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                      FIGMA
                    </span>
                    <h5 className="font-bold text-slate-900">Mobile Wireframes</h5>
                    <p className="text-slate-500 text-[11px]">High fidelity design kit</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3.5 space-y-1 text-xs">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                      API SPECS
                    </span>
                    <h5 className="font-bold text-slate-900">Swagger OpenAPI Doc</h5>
                    <p className="text-slate-500 text-[11px]">REST endpoints and payloads</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 7. TARGET PERSONAS / USE CASES ───────────────────────────── */}
      <section id="use-cases" className="py-20 sm:py-28 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Designed For Campus Builders
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Engineered for every stage of your college journey.
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Persona 1 */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 mb-6 font-bold">
                  🎓
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Capstone & Final Year Projects
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Keep your 4-person team aligned over a 16-week semester. Track milestone deliverables, hold recurring advisor syncs, and archive your technical architecture.
                </p>
              </div>
              <ul className="mt-6 border-t pt-4 space-y-2 text-xs text-slate-700 font-medium">
                <li>✓ Milestone completion tracking</li>
                <li>✓ Advisor progress reports</li>
                <li>✓ Centralized documentation</li>
              </ul>
            </div>

            {/* Persona 2 */}
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/30 p-8 shadow-xs flex flex-col justify-between ring-1 ring-indigo-500/10">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white mb-6 font-bold">
                  ⚡
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Hackathon Squads
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Build and ship in 36 hours. Quickly recruit missing skills like UI designers or ML specialists, assign rapid tasks, and debug in real time.
                </p>
              </div>
              <ul className="mt-6 border-t border-indigo-100 pt-4 space-y-2 text-xs text-slate-700 font-medium">
                <li>✓ Instant team assembly</li>
                <li>✓ Urgent task prioritization</li>
                <li>✓ Fast Google Meet huddles</li>
              </ul>
            </div>

            {/* Persona 3 */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 mb-6 font-bold">
                  🚀
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Clubs & Open Source Labs
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Manage departmental coding clubs and multi-developer campus open source repositories with transparent applicant approval flows.
                </p>
              </div>
              <ul className="mt-6 border-t pt-4 space-y-2 text-xs text-slate-700 font-medium">
                <li>✓ Applicant approval workflow</li>
                <li>✓ Role-based permissions</li>
                <li>✓ Permanent resource library</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL HIGH-IMPACT CTA BANNER ──────────────────────────── */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-700 p-8 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Ready to build something incredible this semester?
              </h2>
              <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
                Join hundreds of student engineers and designers collaborating on cutting-edge software, hardware, and research projects.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                <SignedOut>
                  <Link
                    to="/sign-up"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-xl hover:bg-slate-50 transition-all hover:scale-[1.02]"
                  >
                    Get Started Free with CampusConnect <ArrowRight size={16} />
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-xl hover:bg-slate-50 transition-all hover:scale-[1.02]"
                  >
                    Enter Workspace <ArrowRight size={16} />
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. MODERN FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                <GraduationCap size={18} />
              </div>
              <span className="text-base font-bold text-slate-900">
                Campus<span className="text-indigo-600">Connect</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 font-medium">
              <Link to="/projects" className="hover:text-indigo-600">
                Explore Projects
              </Link>
              <a href="#features" className="hover:text-indigo-600">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-indigo-600">
                Workflow
              </a>
              <Link to="/sign-in" className="hover:text-indigo-600">
                Student Login
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} CampusConnect. Built for student innovators and campus collaboration.</p>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                React • Vite • Node.js • Express • MongoDB • Socket.IO
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
