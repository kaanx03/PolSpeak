"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchLessonContent } from "@/lib/supabase-helpers";

interface SavedLesson {
  level: string;
  id: string;
  title: string;
  modules: any[];
  status: "draft" | "published";
  lastModified: string;
}

const levelConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  a1: { label: "A1 - Beginner", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  a2: { label: "A2 - Elementary", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  b1: { label: "B1 - Intermediate", color: "text-indigo-700", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
  b2: { label: "B2 - Upper Int.", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  c1: { label: "C1 - Advanced", color: "text-rose-700", bgColor: "bg-rose-50", borderColor: "border-rose-200" },
  c2: { label: "C2 - Proficient", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
};

export default function PresentationPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({
    a1: false, a2: false, b1: false, b2: false, c1: false, c2: false
  });

  // Load all published lessons from Supabase
  useEffect(() => {
    loadAllLessons();
  }, []);

  const loadAllLessons = async () => {
    const allLessonData = await fetchLessonContent();

    // Only show published lessons
    const publishedLessons: SavedLesson[] = allLessonData
      .filter((lesson: any) => lesson.status === "published")
      .map((lesson: any) => ({
        level: lesson.level,
        id: lesson.id,
        title: lesson.title || "Untitled Lesson",
        modules: lesson.modules || [],
        status: lesson.status,
        lastModified: lesson.updated_at || lesson.created_at || new Date().toISOString(),
      }));

    // Sort by last modified
    publishedLessons.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    setLessons(publishedLessons);
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      searchQuery === "" ||
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group lessons by level
  const lessonsByLevel = filteredLessons.reduce((acc, lesson) => {
    if (!acc[lesson.level]) {
      acc[lesson.level] = [];
    }
    acc[lesson.level].push(lesson);
    return acc;
  }, {} as Record<string, SavedLesson[]>);

  const handlePresentLesson = (level: string, id: string) => {
    router.push(`/lessons/${level}/${id}/present`);
  };

  const toggleLevel = (level: string) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const levels = ["a1", "a2", "b1", "b2", "c1", "c2"];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-3 md:px-6 py-4 md:py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight truncate">
                  Presentation Mode
                </h2>
                <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                  Select a published lesson to present to your students
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-3 mt-4 md:mt-6">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search published lessons..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mt-4">
              <div className="px-4 py-2 rounded-lg border border-slate-200 bg-white">
                <span className="text-sm font-medium text-slate-600">
                  {lessons.length} published lesson{lessons.length !== 1 ? 's' : ''} available
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons by Level */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    slideshow
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b] mb-2">
                  No published lessons
                </h3>
                <p className="text-slate-500 text-sm">
                  Publish lessons in the Lessons page to present them here
                </p>
              </div>
            ) : (
              levels.map((level) => {
                const levelLessons = lessonsByLevel[level] || [];
                if (levelLessons.length === 0 && searchQuery) return null;

                const config = levelConfig[level];
                const isExpanded = expandedLevels[level];

                return (
                  <div
                    key={level}
                    className={`bg-white rounded-xl border-2 ${config.borderColor} overflow-hidden`}
                  >
                    {/* Level Header - Folder */}
                    <button
                      onClick={() => toggleLevel(level)}
                      className={`w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 ${config.bgColor} hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[24px] ${config.color}`}>
                          {isExpanded ? "folder_open" : "folder"}
                        </span>
                        <div className="text-left">
                          <h3 className={`text-base md:text-lg font-bold ${config.color}`}>
                            {config.label}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {levelLessons.length} lesson{levelLessons.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined ${config.color} transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {/* Level Lessons */}
                    {isExpanded && (
                      <div className="p-3 md:p-4">
                        {levelLessons.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">
                            No published lessons in this level
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {levelLessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-white p-4 transition-all group cursor-pointer"
                                onClick={() => handlePresentLesson(lesson.level, lesson.id)}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="text-sm md:text-base font-semibold text-slate-800 line-clamp-2 flex-1">
                                    {lesson.title}
                                  </h4>
                                  <span className="material-symbols-outlined text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity text-[20px]">
                                    play_circle
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">widgets</span>
                                    {lesson.modules.length} modules
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {new Date(lesson.lastModified).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePresentLesson(lesson.level, lesson.id);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]">present_to_all</span>
                                  Present
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
