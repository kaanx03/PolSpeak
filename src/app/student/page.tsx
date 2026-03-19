"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  fetchStudentByUserId,
  fetchStudentHomework,
  fetchSharedLessonsForStudent,
  fetchLessonContentById,
  fetchCurriculumTopics,
  type Student,
  type StudentHomework,
  type SharedLesson,
  type LessonContent,
  type CurriculumTopic,
} from "@/lib/supabase-helpers";

// Settings panel
function SettingsPanel({ studentName, onSignOut }: { studentName: string; onSignOut: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    try {
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email found");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) { setPwError("Current password is incorrect."); setPwLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">{studentName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-navy-dark text-lg">{studentName}</p>
            <p className="text-sm text-slate-500">Student account</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-navy-dark mb-1">Change Password</h3>
        <p className="text-sm text-slate-500 mb-5">Update your account password</p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">lock</span>
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={pwLoading}
                placeholder="Enter current password"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">lock_open</span>
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={pwLoading}
                placeholder="At least 6 characters"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">lock_open</span>
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={pwLoading}
                placeholder="Repeat new password"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
              />
            </div>
          </div>
          {pwError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <span className="material-symbols-outlined text-base">error</span>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Password updated successfully!
            </div>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full h-11 bg-navy-dark hover:bg-navy-light text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {pwLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : "Update Password"}
          </button>
        </form>
      </div>

    </div>
  );
}

interface SharedLessonWithContent extends SharedLesson {
  lesson?: LessonContent;
}

export default function StudentPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopic[]>([]);
  const [homework, setHomework] = useState<StudentHomework[]>([]);
  const [sharedLessons, setSharedLessons] = useState<SharedLessonWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"homework" | "lessons" | "progress" | "settings">("homework");

  useEffect(() => { loadStudentData(); }, []);

  const loadStudentData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const student = await fetchStudentByUserId(session.user.id);
      if (!student) { setLoading(false); return; }

      setStudentName(student.name);
      setStudentId(student.id);
      setStudentData(student);

      const topicIds: string[] = student.topics_covered || [];
      const [hw, shared, allTopics] = await Promise.all([
        fetchStudentHomework(student.id),
        fetchSharedLessonsForStudent(student.id),
        topicIds.length > 0 ? fetchCurriculumTopics() : Promise.resolve([]),
      ]);
      setCurriculumTopics(allTopics);

      setHomework(hw);

      const sharedWithContent = await Promise.all(
        shared.map(async (s) => {
          const lesson = await fetchLessonContentById(s.lesson_content_id);
          return { ...s, lesson: lesson || undefined };
        })
      );
      setSharedLessons(sharedWithContent);
    } catch (err) {
      console.error("Error loading student data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };


  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      a1: "bg-green-100 text-green-700", a2: "bg-teal-100 text-teal-700",
      b1: "bg-blue-100 text-blue-700", b2: "bg-indigo-100 text-indigo-700",
      c1: "bg-purple-100 text-purple-700", c2: "bg-pink-100 text-pink-700",
    };
    return colors[level?.toLowerCase()] || "bg-slate-100 text-slate-700";
  };

  const getStatusInfo = (hw: StudentHomework) => {
    const status = hw.status || "pending";
    if (status === "graded") return { label: "Graded", cls: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500", icon: "workspace_premium", iconColor: "text-emerald-500" };
    if (status === "submitted") return { label: "Submitted", cls: "bg-blue-100 text-blue-700", border: "border-l-blue-400", icon: "task_alt", iconColor: "text-blue-500" };
    if (hw.due_date && new Date(hw.due_date) < new Date()) return { label: "Overdue", cls: "bg-red-100 text-red-600", border: "border-l-red-400", icon: "warning", iconColor: "text-red-500" };
    return { label: "Pending", cls: "bg-amber-100 text-amber-700", border: "border-l-amber-400", icon: "assignment", iconColor: "text-amber-500" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Account Not Linked</h2>
          <p className="text-slate-500 text-sm mb-6">Your account is not linked to a student profile. Please contact your teacher.</p>
          <button onClick={handleSignOut} className="w-full h-11 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = homework.filter((h) => !h.status || h.status === "pending").length;
  const submittedCount = homework.filter((h) => h.status === "submitted").length;
  const gradedCount = homework.filter((h) => h.status === "graded").length;


  const navItems = [
    { tab: "homework" as const, label: "Homework", icon: "assignment", badge: pendingCount },
    { tab: "lessons" as const, label: "Lessons", icon: "menu_book", badge: sharedLessons.length },
    { tab: "progress" as const, label: "Progress", icon: "bar_chart", badge: 0 },
  ];

  const pageTitles: Record<string, { title: string; sub: string }> = {
    homework: { title: "Homework", sub: "Your assigned homework" },
    lessons: { title: "Lessons", sub: "Lessons shared by your teacher" },
    progress: { title: "Progress", sub: "Your learning progress" },
    settings: { title: "Settings", sub: "Account settings" },
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">

      {/* ── Sidebar ── desktop */}
      <aside className="hidden xl:flex w-64 bg-[#00132c] flex-col shrink-0 border-r border-[#0f2545]/50">
        <div className="p-5 flex items-center gap-3">
          <Image src="/logo.png" alt="PolSpeak" width={40} height={40} className="size-10 rounded-xl shadow-lg" />
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">PolSpeak</h1>
            <p className="text-slate-400 text-xs">Student Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-1 mt-2">
          {navItems.map(({ tab, label, icon, badge }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full text-left ${active ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {icon}
                </span>
                <span className={`text-sm flex-1 ${active ? "font-bold" : "font-medium"}`}>{label}</span>
                {badge > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full text-left ${activeTab === "settings" ? "bg-white/10 text-white ring-1 ring-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <span className="material-symbols-outlined" style={activeTab === "settings" ? { fontVariationSettings: "'FILL' 1" } : undefined}>settings</span>
            <span className={`text-sm ${activeTab === "settings" ? "font-bold" : "font-medium"}`}>Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-slate-400 hover:bg-red-500/10 hover:text-red-400 group w-full text-left"
          >
            <span className="material-symbols-outlined group-hover:text-red-400 transition-colors">logout</span>
            <span className="text-sm font-medium">Sign out</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-3 mt-1">
            <div className="size-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{studentName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{studentName}</p>
              <p className="text-slate-400 text-[10px]">Student</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 xl:pb-8">

          {/* Page header */}
          <div className="flex flex-col wide:flex-row wide:items-center wide:justify-between gap-3 mb-6 wide:mb-8">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-navy-dark tracking-tight">{pageTitles[activeTab].title}</h1>
              <p className="text-text-muted text-xs sm:text-sm mt-0.5">{pageTitles[activeTab].sub}</p>
            </div>
          </div>

          {/* Stats — homework tab only */}
          {activeTab === "homework" && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { count: pendingCount, label: "Pending", bg: "bg-amber-50", ring: "ring-amber-100", icon: "hourglass_empty", color: "text-amber-600" },
                { count: submittedCount, label: "Submitted", bg: "bg-blue-50", ring: "ring-blue-100", icon: "task_alt", color: "text-blue-600" },
                { count: gradedCount, label: "Graded", bg: "bg-emerald-50", ring: "ring-emerald-100", icon: "workspace_premium", color: "text-emerald-600" },
              ].map(({ count, label, bg, ring, icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
                  <div className={`size-9 sm:size-12 rounded-xl ${bg} ring-4 ${ring} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${color} text-lg sm:text-2xl`}>{icon}</span>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-navy-dark">{count}</p>
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <SettingsPanel studentName={studentName} onSignOut={handleSignOut} />
        )}

        {/* Homework Tab */}
        {activeTab === "homework" && (
          <div className="space-y-2.5">
            {homework.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="size-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-amber-400 text-3xl">assignment</span>
                </div>
                <p className="text-slate-800 font-semibold mb-1">No homework yet</p>
                <p className="text-slate-400 text-sm">Your teacher hasn't assigned any homework yet.</p>
              </div>
            ) : (
              homework.map((hw) => {
                const info = getStatusInfo(hw);
                return (
                  <button
                    key={hw.id}
                    onClick={() => router.push(`/student/homework/${hw.id}`)}
                    className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-3 p-4 cursor-pointer"
                  >
                    <div className={`size-2.5 rounded-full shrink-0 ${
                      hw.status === "graded" ? "bg-emerald-500" :
                      hw.status === "submitted" ? "bg-blue-500" :
                      hw.due_date && new Date(hw.due_date) < new Date() ? "bg-red-500" :
                      "bg-amber-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-navy-dark text-sm">{hw.title}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>
                      </div>
                      {hw.due_date && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Due {new Date(hw.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-xl shrink-0">chevron_right</span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (() => {
          const schedule = studentData?.recurring_schedule;
          const coveredIds: string[] = studentData?.topics_covered || [];
          const customTopics: string[] = studentData?.custom_topics || [];
          const coveredTopics = curriculumTopics.filter((t) => coveredIds.includes(t.id));

          // Next lesson calculation
          let nextLessonLabel = "";
          if (schedule) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const now = new Date();
            const today = now.getDay();
            let diff = schedule.day - today;
            if (diff < 0) diff += 7;
            if (diff === 0) {
              const [h, m] = schedule.startTime.split(":").map(Number);
              const lessonTime = new Date(now);
              lessonTime.setHours(h, m, 0, 0);
              if (now > lessonTime) diff = 7;
            }
            const nextDate = new Date(now);
            nextDate.setDate(now.getDate() + diff);
            const isToday = diff === 0;
            const isTomorrow = diff === 1;
            const dateStr = nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            nextLessonLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : `${days[schedule.day]}, ${dateStr}`;
          }

          const levelColors: Record<string, string> = {
            a1: "bg-green-100 text-green-700 border-green-200",
            a2: "bg-teal-100 text-teal-700 border-teal-200",
            b1: "bg-blue-100 text-blue-700 border-blue-200",
            b2: "bg-indigo-100 text-indigo-700 border-indigo-200",
            c1: "bg-purple-100 text-purple-700 border-purple-200",
            c2: "bg-pink-100 text-pink-700 border-pink-200",
          };

          // Group covered topics by level
          const grouped: Record<string, CurriculumTopic[]> = {};
          for (const t of coveredTopics) {
            if (!grouped[t.level]) grouped[t.level] = [];
            grouped[t.level].push(t);
          }

          return (
            <div className="space-y-4">
              {/* Schedule card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-indigo-500 text-lg">schedule</span>
                  </div>
                  <div>
                    <p className="font-bold text-navy-dark text-sm">Lesson Schedule</p>
                    <p className="text-xs text-slate-400">Your recurring class time</p>
                  </div>
                </div>

                {schedule ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3.5 bg-indigo-50 rounded-xl border border-indigo-100">
                      <span className="material-symbols-outlined text-indigo-500 text-xl">event_repeat</span>
                      <div>
                        <p className="text-sm font-semibold text-navy-dark">
                          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][schedule.day]}
                        </p>
                        <p className="text-xs text-slate-500">{schedule.startTime} – {schedule.endTime} · {schedule.duration} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="material-symbols-outlined text-amber-500 text-base">upcoming</span>
                      <span className="text-xs font-semibold text-amber-700">Next lesson: {nextLessonLabel} at {schedule.startTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">No schedule set by your teacher yet.</p>
                  </div>
                )}
              </div>

              {/* Topics covered */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-500 text-lg">checklist</span>
                  </div>
                  <div>
                    <p className="font-bold text-navy-dark text-sm">Topics Covered</p>
                    <p className="text-xs text-slate-400">{coveredIds.length + customTopics.length} topic{coveredIds.length + customTopics.length !== 1 ? "s" : ""} completed</p>
                  </div>
                </div>

                {coveredIds.length === 0 && customTopics.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">No topics marked as covered yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([level, topics]) => (
                      <div key={level}>
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mb-2 ${levelColors[level] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {level.toUpperCase()}
                        </span>
                        <div className="space-y-1.5">
                          {topics.map((t) => (
                            <div key={t.id} className="flex items-start gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                              <span className="material-symbols-outlined text-emerald-500 text-base mt-0.5 shrink-0">check_circle</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700">{t.title}</p>
                                {t.category && <p className="text-[11px] text-slate-400">{t.category}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {customTopics.length > 0 && (
                      <div>
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mb-2 bg-slate-100 text-slate-600 border-slate-200">
                          Custom
                        </span>
                        <div className="space-y-1.5">
                          {customTopics.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="material-symbols-outlined text-slate-400 text-base shrink-0">check_circle</span>
                              <p className="text-sm font-medium text-slate-700">{t}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Lessons Tab */}
        {activeTab === "lessons" && (
          <div className="space-y-2.5">
            {sharedLessons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="size-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-indigo-400 text-3xl">menu_book</span>
                </div>
                <p className="text-slate-800 font-semibold mb-1">No lessons shared yet</p>
                <p className="text-slate-400 text-sm">Your teacher hasn't shared any lessons with you yet.</p>
              </div>
            ) : (
              sharedLessons.map((sl) => (
                <div key={sl.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 flex items-center gap-4">
                    <div className="size-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-xl">auto_stories</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy-dark truncate text-sm">{sl.lesson?.title || "Untitled Lesson"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {sl.lesson?.level && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getLevelColor(sl.lesson.level)}`}>
                            {sl.lesson.level.toUpperCase()}
                          </span>
                        )}
                        {sl.lesson?.modules && (
                          <span className="text-xs text-slate-400">{sl.lesson.modules.length} module{sl.lesson.modules.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/lessons/${sl.lesson?.level}/${sl.lesson_content_id}/present`}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 h-9 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      Start
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        </div>
      </main>

      {/* ── Bottom nav ── mobile */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#00132c] border-t border-[#0f2545]/50">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map(({ tab, label, icon }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${active ? "text-indigo-300" : "text-slate-400 hover:text-white"}`}
              >
                <span className="material-symbols-outlined text-[24px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${activeTab === "settings" ? "text-indigo-300" : "text-slate-400 hover:text-white"}`}
          >
            <span className="material-symbols-outlined text-[24px]" style={activeTab === "settings" ? { fontVariationSettings: "'FILL' 1" } : undefined}>settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
