import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FolderKanban, Github, Linkedin, Pencil, Users, Award, BookOpen, Compass } from "lucide-react";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import SkillBadges from "../components/SkillBadges.jsx";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [createdProjects, setCreatedProjects] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/users/me"), api.get("/users/me/dashboard")])
      .then(([meRes, dashRes]) => {
        setUser(meRes.data.user);
        setMetrics(dashRes.data.metrics);
        setCreatedProjects(dashRes.data.createdProjects || []);
        const accepted = (dashRes.data.applications || []).filter(
          (a) => a.status === "accepted" && a.projectId
        );
        setMemberships(accepted);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading profile..." />;
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Profile</p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{user.name || "Student"}</h1>
            {user.experienceLevel && (
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-xs font-bold text-indigo-700">
                {user.experienceLevel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
        <Link
          to="/profile/edit"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Pencil size={14} /> Edit Profile & Skills
        </Link>
      </div>

      {/* Info card */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="College" value={user.college} />
          <Field label="Branch" value={user.branch} />
          <Field label="Year" value={user.year} />
        </div>

        {user.bio && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bio</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{user.bio}</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Technical Skills ({user.skills?.length || 0})
          </p>
          {user.skills?.length > 0 ? (
            <SkillBadges skills={user.skills} tone="indigo" />
          ) : (
            <p className="text-xs text-slate-400 italic">No skills added yet.</p>
          )}
        </div>

        {user.preferredCategories?.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Compass size={13} /> Preferred Project Domains
            </p>
            <div className="flex flex-wrap gap-1.5">
              {user.preferredCategories.map((c) => (
                <span
                  key={c}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {user.learningGoals?.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <BookOpen size={13} /> Learning Goals
            </p>
            <p className="text-xs text-slate-700">
              {user.learningGoals.join(" • ")}
            </p>
          </div>
        )}

        {user.interests?.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Interests</p>
            <p className="text-xs text-slate-700">{user.interests.join(", ")}</p>
          </div>
        )}

        <div className="flex gap-4 border-t border-slate-100 pt-4 text-xs font-semibold">
          {user.github && (
            <a
              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800"
              href={user.github}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={14} /> GitHub <ExternalLink size={11} />
            </a>
          )}
          {user.linkedin && (
            <a
              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800"
              href={user.linkedin}
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin size={14} /> LinkedIn <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      {metrics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <FolderKanban size={16} className="text-indigo-600" />
              <span className="text-xs font-semibold">Projects Created</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.projectsCreated}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Users size={16} className="text-emerald-600" />
              <span className="text-xs font-semibold">Active Memberships</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.activeMemberships}</p>
          </div>
        </div>
      )}

      {/* My Projects */}
      {createdProjects.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-slate-900">Created Projects</h2>
          <div className="divide-y divide-slate-100">
            {createdProjects.map((p) => (
              <div key={p._id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/projects/${p._id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 text-sm truncate block"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.category} • {p.members.length}/{p.teamSize} members
                  </p>
                </div>
                <Link
                  to={`/projects/${p._id}`}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex-shrink-0"
                >
                  Workspace →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teams I'm in */}
      {memberships.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-slate-900">Teams You're In</h2>
          <div className="divide-y divide-slate-100">
            {memberships.map((app) => (
              <div key={app._id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{app.projectTitle}</p>
                  <span className="text-[11px] text-emerald-700 font-semibold">✓ Active Member</span>
                </div>
                <Link
                  to={`/projects/${app.projectId}`}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex-shrink-0"
                >
                  Workspace →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}
