import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Compass,
  CheckCircle2,
  Calendar,
  Users,
} from "lucide-react";
import api from "../api/client.js";
import ProjectCard from "../components/ProjectCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Loader from "../components/Loader.jsx";
import SkillBadges from "../components/SkillBadges.jsx";
import { PROJECT_CATEGORIES } from "../constants/skills.js";

const PAGE_SIZE = 12;

export default function Projects() {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "recommended"
  const [projects, setProjects] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [q, category]);

  // Load all projects with search/filters
  useEffect(() => {
    if (activeTab !== "all") return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get("/projects", {
          params: { q, category, page, limit: PAGE_SIZE },
        });
        setProjects(res.data.projects);
        setPagination(res.data.pagination);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [q, category, page, activeTab]);

  // Load recommendations
  useEffect(() => {
    if (activeTab === "recommended" && recommendations.length === 0) {
      setLoadingRecs(true);
      api
        .get("/projects/recommendations")
        .then((res) => {
          setRecommendations(res.data.recommendations || []);
        })
        .catch((err) => {
          console.error("Failed to load recommendations:", err);
        })
        .finally(() => setLoadingRecs(false));
    }
  }, [activeTab, recommendations.length]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Explore</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Find Project Teams</h1>
          <p className="mt-1 text-sm text-slate-500">
            Collaborate on campus projects based on skill matching and team needs.
          </p>
        </div>
        <Link
          to="/projects/create"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Create Project
        </Link>
      </div>

      {/* View Tabs: All Projects vs Recommended */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Compass size={15} /> All Open Projects
        </button>

        <button
          onClick={() => setActiveTab("recommended")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "recommended"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles size={15} className="text-amber-300" /> Recommended For You
        </button>
      </div>

      {/* ── ALL PROJECTS VIEW ────────────────────────────────────────── */}
      {activeTab === "all" && (
        <>
          {/* Search + Filter bar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="relative">
              <SlidersHorizontal
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
              >
                <option>All</option>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <Loader label="Loading projects..." />
          ) : error ? (
            <div className="rounded-xl bg-rose-50 p-6 text-center text-rose-700">
              {error}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No open projects found"
              description={
                q || category !== "All"
                  ? "Try clearing your filters or searching with different keywords."
                  : "No projects have been published yet. Be the first to start one!"
              }
              actionLabel="Create a Project"
              actionTo="/projects/create"
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project._id} project={project} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-semibold text-slate-600">
                  <button
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── RECOMMENDED FOR YOU VIEW ─────────────────────────────────── */}
      {activeTab === "recommended" && (
        <div>
          {loadingRecs ? (
            <Loader label="Calculating skill matches..." />
          ) : recommendations.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No recommendations right now"
              description="Make sure you've added skills and interests to your profile, or check back when new projects are created!"
              actionLabel="Edit Your Profile Skills"
              actionTo="/profile/edit"
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => {
                const proj = rec.project;
                return (
                  <div
                    key={proj._id}
                    className="flex flex-col justify-between rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md"
                  >
                    <div>
                      {/* Header with Match % pill */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {proj.category}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            rec.matchScore >= 70
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : rec.matchScore >= 40
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {rec.matchScore}% Match
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                        {proj.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {proj.description}
                      </p>

                      {/* Explanation box */}
                      <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
                        <p className="font-semibold text-indigo-700 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Why it matches
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">{rec.reason}</p>
                      </div>

                      {/* Matched skills */}
                      {rec.matchedSkills?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Matching Skills
                          </p>
                          <SkillBadges skills={rec.matchedSkills} tone="emerald" />
                        </div>
                      )}

                      {/* Missing skills */}
                      {rec.missingSkills?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Skills You'll Learn
                          </p>
                          <SkillBadges skills={rec.missingSkills} tone="rose" />
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-indigo-600">
                        <Users size={13} /> {rec.spotsLeft} spot{rec.spotsLeft !== 1 ? "s" : ""} left
                      </span>

                      <Link
                        to={`/projects/${proj._id}`}
                        className="rounded-xl bg-indigo-50 px-3 py-1.5 font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        View & Apply →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
