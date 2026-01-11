"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchStudents, fetchGroups, fetchLessons, Student as DbStudent, Group as DbGroup, Lesson as DbLesson } from "@/lib/supabase-helpers";

interface DashboardStats {
  totalLessons: number;
  publishedLessons: number;
  draftLessons: number;
  totalStudents: number;
  totalModules: number;
  curriculumTopics: number;
  scheduledLessons: number;
}

interface RecentLesson {
  id: string;
  level: string;
  title: string;
  modules: any[];
  status: "draft" | "published";
  lastModified: string;
  curriculumTopicId?: string;
}

interface UpcomingLesson {
  id: string;
  studentId?: string;
  groupId?: string;
  studentName: string;
  title: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  type: "regular" | "trial" | "makeup";
  isGroup?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalLessons: 0,
    publishedLessons: 0,
    draftLessons: 0,
    totalStudents: 0,
    totalModules: 0,
    curriculumTopics: 0,
    scheduledLessons: 0,
  });
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Load students and groups from Supabase
    const [studentsData, groupsData, lessonsData] = await Promise.all([
      fetchStudents(),
      fetchGroups(),
      fetchLessons()
    ]);

    // Load curriculum topics from localStorage (will migrate later)
    const curriculumData = localStorage.getItem("curriculum-topics");
    const curriculumTopics = curriculumData ? JSON.parse(curriculumData) : [];

    // Load lesson content from localStorage (will migrate later)
    const allLessons: RecentLesson[] = [];
    const levels = ["a1", "a2", "b1", "b2", "c1"];
    let totalModules = 0;

    levels.forEach((level) => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`lesson-${level}-`)) {
          const data = localStorage.getItem(key);
          if (data) {
            const lessonData = JSON.parse(data);
            const lessonId = key.replace(`lesson-${level}-`, "");
            allLessons.push({
              id: lessonId,
              level,
              title: lessonData.title || "Untitled Lesson",
              modules: lessonData.modules || [],
              status: lessonData.status || "draft",
              lastModified: lessonData.lastModified || new Date().toISOString(),
              curriculumTopicId: lessonData.curriculumTopicId,
            });
            totalModules += (lessonData.modules || []).length;
          }
        }
      }
    });

    // Map Supabase data
    const students = studentsData;
    const groups = groupsData;
    const scheduledLessons = lessonsData;

    // Process upcoming lessons (today and future, next 7 days)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingList: UpcomingLesson[] = [];

    scheduledLessons.forEach((lesson: any) => {
      const lessonDate = new Date(lesson.date);
      const daysDiff = Math.floor((lessonDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Only show lessons from today onwards (next 7 days) and not completed
      if (daysDiff >= 0 && daysDiff <= 7 && !lesson.completed) {
        let studentName = "Unknown";
        let isGroup = false;

        if (lesson.group_id) {
          // Group lesson
          const group = groups.find((g: any) => g.id === lesson.group_id);
          studentName = group?.name || "Unknown Group";
          isGroup = true;
        } else if (lesson.student_id) {
          // Individual lesson
          const student = students.find((s: any) => s.id === lesson.student_id);
          studentName = student?.name || "Unknown Student";
        }

        upcomingList.push({
          id: lesson.id,
          studentId: lesson.student_id,
          groupId: lesson.group_id,
          studentName,
          title: lesson.title,
          day: lesson.day,
          date: lesson.date,
          startTime: lesson.start_time,
          endTime: lesson.end_time,
          type: lesson.type,
          isGroup,
        });
      }
    });

    // Sort upcoming lessons by date and time
    upcomingList.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Sort lessons by lastModified
    allLessons.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    setRecentLessons(allLessons.slice(0, 5));
    setUpcomingLessons(upcomingList.slice(0, 5));
    setStats({
      totalLessons: allLessons.length,
      publishedLessons: allLessons.filter((l) => l.status === "published").length,
      draftLessons: allLessons.filter((l) => l.status === "draft").length,
      totalStudents: students.length,
      totalModules,
      curriculumTopics: curriculumTopics.length,
      scheduledLessons: scheduledLessons.length,
    });
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      a1: "bg-emerald-50 text-emerald-700 border-emerald-200",
      a2: "bg-blue-50 text-blue-700 border-blue-200",
      b1: "bg-indigo-50 text-indigo-700 border-indigo-200",
      b2: "bg-purple-50 text-purple-700 border-purple-200",
      c1: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return colors[level] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      a1: "A1 Beginner",
      a2: "A2 Elementary",
      b1: "B1 Intermediate",
      b2: "B2 Upper Int.",
      c1: "C1 Advanced",
    };
    return labels[level] || level.toUpperCase();
  };

  const getLessonTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      regular: "bg-blue-50 text-blue-700 border-blue-200",
      trial: "bg-amber-50 text-amber-700 border-amber-200",
      makeup: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return colors[type] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const formatUpcomingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0]">
          <div className="px-3 md:px-6 py-4 md:py-5">
            <div className="max-w-7xl mx-auto">
              <div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight">
                  Dashboard
                </h2>
                <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                  Overview of your teaching toolkit
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 md:px-6 py-4 md:py-6">
          <div className="max-w-7xl mx-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <div className="p-3 md:p-4 rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Total Lessons
                  </p>
                  <div className="size-8 rounded-full bg-indigo-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 text-[18px]">
                      book_2
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b]">
                  {stats.totalLessons}
                </h3>
                <p className="text-xs text-[#64748b] mt-1">
                  {stats.publishedLessons} published
                </p>
              </div>

              <div className="p-3 md:p-4 rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Students
                  </p>
                  <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">
                      groups
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b]">
                  {stats.totalStudents}
                </h3>
                <p className="text-xs text-[#64748b] mt-1">Active learners</p>
              </div>

              <div className="p-3 md:p-4 rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Modules
                  </p>
                  <div className="size-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                      widgets
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b]">
                  {stats.totalModules}
                </h3>
                <p className="text-xs text-[#64748b] mt-1">In all lessons</p>
              </div>

              <div className="p-3 md:p-4 rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    Schedule
                  </p>
                  <div className="size-8 rounded-full bg-amber-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">
                      calendar_month
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b]">
                  {stats.scheduledLessons}
                </h3>
                <p className="text-xs text-[#64748b] mt-1">This week</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <button
                onClick={() => router.push("/lessons")}
                className="p-4 rounded-lg border border-[#e2e8f0] bg-white hover:border-indigo-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600">book_2</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1e293b]">Lessons</h3>
                </div>
                <p className="text-xs text-[#64748b] mb-3">Create and manage lessons</p>
                <div className="flex items-center text-xs text-indigo-600 font-medium group-hover:gap-2 transition-all">
                  <span>Go to Lessons</span>
                  <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_forward
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push("/curriculum")}
                className="p-4 rounded-lg border border-[#e2e8f0] bg-white hover:border-indigo-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">menu_book</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1e293b]">Curriculum</h3>
                </div>
                <p className="text-xs text-[#64748b] mb-3">
                  {stats.curriculumTopics} topics organized
                </p>
                <div className="flex items-center text-xs text-purple-600 font-medium group-hover:gap-2 transition-all">
                  <span>Manage Topics</span>
                  <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_forward
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push("/schedule")}
                className="p-4 rounded-lg border border-[#e2e8f0] bg-white hover:border-indigo-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600">
                      calendar_month
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1e293b]">Schedule</h3>
                </div>
                <p className="text-xs text-[#64748b] mb-3">View weekly calendar</p>
                <div className="flex items-center text-xs text-amber-600 font-medium group-hover:gap-2 transition-all">
                  <span>Open Schedule</span>
                  <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_forward
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push("/presentation")}
                className="p-4 rounded-lg border border-[#e2e8f0] bg-white hover:border-indigo-300 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-lg bg-rose-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-rose-600">slideshow</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1e293b]">Presentation</h3>
                </div>
                <p className="text-xs text-[#64748b] mb-3">Present lessons to students</p>
                <div className="flex items-center text-xs text-rose-600 font-medium group-hover:gap-2 transition-all">
                  <span>Start Presenting</span>
                  <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_forward
                  </span>
                </div>
              </button>
            </div>

            {/* Upcoming Lessons */}
            <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden mb-6">
              <div className="px-4 md:px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-[#1e293b]">Upcoming Lessons</h3>
                <button
                  onClick={() => router.push("/schedule")}
                  className="text-xs md:text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                >
                  View Schedule
                </button>
              </div>

              {upcomingLessons.length === 0 ? (
                <div className="p-8 md:p-12 text-center">
                  <div className="size-12 md:size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <span className="material-symbols-outlined text-2xl md:text-3xl text-slate-400">
                      event_available
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-[#1e293b] mb-2">No upcoming lessons</h3>
                  <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
                    Schedule lessons for the next 7 days to see them here
                  </p>
                  <button
                    onClick={() => router.push("/schedule")}
                    className="px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Go to Schedule
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#e2e8f0]">
                  {upcomingLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="px-4 md:px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm md:text-base font-semibold text-[#1e293b] truncate">
                              {lesson.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${getLessonTypeColor(
                                lesson.type
                              )}`}
                            >
                              {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#64748b]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                {lesson.isGroup ? "groups" : "person"}
                              </span>
                              {lesson.studentName}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                schedule
                              </span>
                              {lesson.startTime} - {lesson.endTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <div className="px-2 py-1 rounded bg-amber-50 border border-amber-200">
                            <p className="text-xs font-semibold text-amber-700">
                              {formatUpcomingDate(lesson.date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Lessons */}
            <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-[#1e293b]">Recent Lessons</h3>
                <button
                  onClick={() => router.push("/lessons")}
                  className="text-xs md:text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                >
                  View All
                </button>
              </div>

              {recentLessons.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      book_2
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1e293b] mb-2">No lessons yet</h3>
                  <p className="text-sm text-[#64748b] mb-4">
                    Create your first lesson to get started
                  </p>
                  <button
                    onClick={() => router.push("/lessons")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Create Lesson
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#e2e8f0]">
                  {recentLessons.map((lesson) => (
                    <div
                      key={`${lesson.level}-${lesson.id}`}
                      className="px-4 md:px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/lessons/${lesson.level}/${lesson.id}/edit`)
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm md:text-base font-semibold text-[#1e293b] truncate">
                              {lesson.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(
                                lesson.level
                              )}`}
                            >
                              {getLevelLabel(lesson.level)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#64748b]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                widgets
                              </span>
                              {lesson.modules.length} modules
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(lesson.lastModified).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {lesson.status === "published" ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                Published
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-500">
                                <span className="size-1.5 rounded-full bg-slate-400"></span>
                                Draft
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/lessons/${lesson.level}/${lesson.id}/present`);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              present_to_all
                            </span>
                          </button>
                          <span className="material-symbols-outlined text-slate-400">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
