"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchLessonContent } from "@/lib/supabase-helpers";

export default function LessonsPage() {
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadLessonCounts();
  }, []);

  const loadLessonCounts = async () => {
    const allLessons = await fetchLessonContent();
    const counts: Record<string, number> = {};

    allLessons.forEach((lesson: any) => {
      counts[lesson.level] = (counts[lesson.level] || 0) + 1;
    });

    setLessonCounts(counts);
  };

  const levels = [
    {
      id: "a1",
      name: "A1 - Beginner",
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-600",
      lessons: lessonCounts["a1"] || 0,
    },
    {
      id: "a2",
      name: "A2 - Elementary",
      color: "bg-blue-50 border-blue-200 text-blue-700",
      iconBg: "bg-blue-100 text-blue-600",
      lessons: lessonCounts["a2"] || 0,
    },
    {
      id: "b1",
      name: "B1 - Intermediate",
      color: "bg-indigo-50 border-indigo-200 text-indigo-700",
      iconBg: "bg-indigo-100 text-indigo-600",
      lessons: lessonCounts["b1"] || 0,
    },
    {
      id: "b2",
      name: "B2 - Upper Intermediate",
      color: "bg-purple-50 border-purple-200 text-purple-700",
      iconBg: "bg-purple-100 text-purple-600",
      lessons: lessonCounts["b2"] || 0,
    },
    {
      id: "c1",
      name: "C1 - Advanced",
      color: "bg-orange-50 border-orange-200 text-orange-700",
      iconBg: "bg-orange-100 text-orange-600",
      lessons: lessonCounts["c1"] || 0,
    },
    {
      id: "c2",
      name: "C2 - Proficiency",
      color: "bg-rose-50 border-rose-200 text-rose-700",
      iconBg: "bg-rose-100 text-rose-600",
      lessons: lessonCounts["c2"] || 0,
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0]">
          <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight">
                    <span className="sm:hidden">Lessons</span>
                    <span className="hidden sm:inline">Lesson Management</span>
                  </h2>
                  <p className="text-[#64748b] text-xs sm:text-sm hidden sm:block">
                    Create and organize lessons by proficiency level
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="max-w-7xl mx-auto w-full pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {levels.map((level) => (
                <Link
                  key={level.id}
                  href={`/lessons/${level.id}`}
                  className={`relative rounded-xl border-2 ${level.color} p-6 hover:shadow-lg transition-all cursor-pointer group block`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`size-12 rounded-lg ${level.iconBg} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-2xl">book_2</span>
                    </div>
                    <span className="text-xs font-medium opacity-75">{level.lessons} lessons</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{level.name}</h3>
                  <p className="text-sm opacity-75 mb-4">
                    Create and manage lessons for this proficiency level
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium group-hover:bg-opacity-90 transition-all">
                    <span>View Lessons</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
