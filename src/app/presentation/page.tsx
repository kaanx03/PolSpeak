"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchLessonContentByLevel } from "@/lib/supabase-helpers";

interface SavedLesson {
  level: string;
  id: string;
  title: string;
  modules: any[];
  status: "draft" | "published";
  lastModified: string;
}

export default function PresentationPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load all lessons from Supabase
  useEffect(() => {
    loadAllLessons();
  }, []);

  const loadAllLessons = async () => {
    const allLessons: SavedLesson[] = [];
    const levels = ["a1", "a2", "b1", "b2", "c1"];

    // Fetch lessons from all levels
    for (const level of levels) {
      const levelLessons = await fetchLessonContentByLevel(level);
      levelLessons.forEach((lesson: any) => {
        allLessons.push({
          level,
          id: lesson.id,
          title: lesson.title || "Untitled Lesson",
          modules: lesson.modules || [],
          status: lesson.status || "draft",
          lastModified: lesson.updated_at || lesson.created_at || new Date().toISOString(),
        });
      });
    }

    // Sort by last modified
    allLessons.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    setLessons(allLessons);
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesLevel = selectedLevel === "all" || lesson.level === selectedLevel;
    const matchesSearch =
      searchQuery === "" ||
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handlePresentLesson = (level: string, id: string) => {
    router.push(`/lessons/${level}/${id}/present`);
  };

  const levelColors: Record<string, string> = {
    a1: "bg-emerald-100 text-emerald-700 border-emerald-200",
    a2: "bg-blue-100 text-blue-700 border-blue-200",
    b1: "bg-indigo-100 text-indigo-700 border-indigo-200",
    b2: "bg-purple-100 text-purple-700 border-purple-200",
    c1: "bg-rose-100 text-rose-700 border-rose-200",
  };

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
                  Select a lesson to present to your students
                </p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-6">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lessons..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                style={{ fontSize: "14px" }}
              >
                <option value="all" style={{ fontSize: "14px", padding: "8px" }}>
                  All Levels
                </option>
                <option value="a1" style={{ fontSize: "14px", padding: "8px" }}>
                  A1
                </option>
                <option value="a2" style={{ fontSize: "14px", padding: "8px" }}>
                  A2
                </option>
                <option value="b1" style={{ fontSize: "14px", padding: "8px" }}>
                  B1
                </option>
                <option value="b2" style={{ fontSize: "14px", padding: "8px" }}>
                  B2
                </option>
                <option value="c1" style={{ fontSize: "14px", padding: "8px" }}>
                  C1
                </option>
              </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Total Lessons</p>
                <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">
                  {lessons.length}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Published</p>
                <p className="text-lg md:text-xl font-bold text-emerald-600 mt-0.5">
                  {lessons.filter((l) => l.status === "published").length}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Drafts</p>
                <p className="text-lg md:text-xl font-bold text-slate-600 mt-0.5">
                  {lessons.filter((l) => l.status === "draft").length}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Total Modules</p>
                <p className="text-lg md:text-xl font-bold text-indigo-600 mt-0.5">
                  {lessons.reduce((sum, l) => sum + l.modules.length, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            {filteredLessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    slideshow
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b] mb-2">
                  {searchQuery || selectedLevel !== "all"
                    ? "No lessons found"
                    : "No lessons yet"}
                </h3>
                <p className="text-slate-500 text-sm">
                  {searchQuery || selectedLevel !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create lessons in the Lessons page to present them here"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredLessons.map((lesson) => (
                  <div
                    key={`${lesson.level}-${lesson.id}`}
                    className="bg-white rounded-lg border-2 border-slate-200 hover:border-indigo-300 p-4 md:p-5 transition-all group cursor-pointer"
                    onClick={() => handlePresentLesson(lesson.level, lesson.id)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                              levelColors[lesson.level]
                            }`}
                          >
                            {lesson.level.toUpperCase()}
                          </span>
                          {lesson.status === "published" ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="size-1.5 rounded-full bg-emerald-500"></span>
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              Draft
                            </span>
                          )}
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                          {lesson.title}
                        </h3>
                      </div>

                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-indigo-600 text-[24px]">
                          play_circle
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          widgets
                        </span>
                        <span>{lesson.modules.length} modules</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          schedule
                        </span>
                        <span>
                          {new Date(lesson.lastModified).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePresentLesson(lesson.level, lesson.id);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          present_to_all
                        </span>
                        <span>Present</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
