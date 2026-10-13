import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import SkillPicker from "../components/SkillPicker.jsx";
import Loader from "../components/Loader.jsx";
import { YEAR_OPTIONS, PROJECT_CATEGORIES } from "../constants/skills.js";

const emptyForm = {
  name: "",
  college: "",
  branch: "",
  year: "",
  bio: "",
  skills: [],
  interests: "",
  github: "",
  linkedin: "",
  experienceLevel: "Intermediate",
  preferredCategories: [],
  learningGoals: "",
};

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users/me")
      .then((res) => {
        const user = res.data.user;
        setForm({
          name: user.name || "",
          college: user.college || "",
          branch: user.branch || "",
          year: user.year || "",
          bio: user.bio || "",
          skills: user.skills || [],
          interests: (user.interests || []).join(", "),
          github: user.github || "",
          linkedin: user.linkedin || "",
          experienceLevel: user.experienceLevel || "Intermediate",
          preferredCategories: user.preferredCategories || [],
          learningGoals: (user.learningGoals || []).join(", "),
        });
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleCategory(cat) {
    setForm((prev) => {
      const exists = prev.preferredCategories.includes(cat);
      const updated = exists
        ? prev.preferredCategories.filter((c) => c !== cat)
        : [...prev.preferredCategories, cat];
      return { ...prev, preferredCategories: updated };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put("/users/profile", {
        ...form,
        interests: form.interests,
        learningGoals: form.learningGoals,
      });
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading profile..." />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-900">Edit Profile & Preferences</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your skills, experience level, and preferred categories power our personalized project recommendation engine.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        <Input label="Name" value={form.name} onChange={(v) => update("name", v)} />
        <Input label="College" value={form.college} onChange={(v) => update("college", v)} />
        <Input label="Branch / Department" value={form.branch} onChange={(v) => update("branch", v)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Year of Study</span>
            <select
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Experience Level</span>
            <select
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
              value={form.experienceLevel}
              onChange={(e) => update("experienceLevel", e.target.value)}
            >
              <option value="Beginner">Beginner (Looking to learn)</option>
              <option value="Intermediate">Intermediate (Built personal projects)</option>
              <option value="Advanced">Advanced (Experienced builder)</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Bio</span>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
            value={form.bio}
            placeholder="Introduce yourself, your coding passions, and what you want to build..."
            onChange={(e) => update("bio", e.target.value)}
          />
        </label>

        {/* Skills Picker */}
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">Technical Skills</p>
          <SkillPicker selected={form.skills} onChange={(skills) => update("skills", skills)} />
        </div>

        {/* Preferred Categories */}
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">
            Preferred Project Domains (Select all that interest you)
          </p>
          <div className="flex flex-wrap gap-2">
            {PROJECT_CATEGORIES.map((cat) => {
              const selected = form.preferredCategories.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Learning Goals (comma separated)"
          value={form.learningGoals}
          onChange={(v) => update("learningGoals", v)}
          placeholder="e.g. Master GraphQL, Learn Docker, Build full-stack mobile apps"
        />

        <Input
          label="Interests (comma separated)"
          value={form.interests}
          onChange={(v) => update("interests", v)}
          placeholder="Hackathons, AI research, Open Source, Startups"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="GitHub Profile URL" value={form.github} onChange={(v) => update("github", v)} placeholder="https://github.com/..." />
          <Input label="LinkedIn Profile URL" value={form.linkedin} onChange={(v) => update("linkedin", v)} placeholder="https://linkedin.com/in/..." />
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile & Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
