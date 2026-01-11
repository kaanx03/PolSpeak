"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchLessonContentByLevel, createLessonContent } from "@/lib/supabase-helpers";

interface Lesson {
  id: string;
  title: string;
  modules: number;
  status: "published" | "draft";
}

export default function LevelLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const level = (params.level as string)?.toUpperCase();
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    loadLessons();
  }, [params.level]);

  const loadLessons = async () => {
    const lessonsData = await fetchLessonContentByLevel(params.level as string);

    const mappedLessons: Lesson[] = lessonsData.map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title || "Untitled Lesson",
      modules: lesson.modules?.length || 0,
      status: lesson.status || "draft",
    }));

    // Sort: published first, then draft
    mappedLessons.sort((a, b) => {
      if (a.status === "published" && b.status === "draft") return -1;
      if (a.status === "draft" && b.status === "published") return 1;
      return 0;
    });

    setLessons(mappedLessons);
  };

  const handleCreateLesson = async () => {
    // Create a new lesson immediately in Supabase
    const newLesson = await createLessonContent({
      title: "Untitled Lesson",
      modules: [],
      level: params.level as any,
      status: "draft",
    });

    // Redirect to the edit page with the new lesson ID
    router.push(`/lessons/${params.level}/${newLesson.id}/edit`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0]">
          <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-3 mb-4">
                <Link href="/lessons" className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight">
                    {level} Lessons
                  </h2>
                  <p className="text-[#64748b] text-xs sm:text-sm">
                    {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} available
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateLesson}
                className="inline-flex items-center gap-2 px-4 h-10 bg-[#00132c] hover:bg-[#0f2545] text-white text-sm font-medium rounded-lg shadow-lg shadow-[#00132c]/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Create New Lesson</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="max-w-7xl mx-auto w-full pb-10">
            {lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    book_2
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b] mb-2">No lessons yet</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Create your first lesson to get started
                </p>
                <button
                  onClick={handleCreateLesson}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Create Lesson</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-xl border border-[#e2e8f0] p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-[#1e293b]">{lesson.title}</h3>
                          {lesson.status === "published" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                              <span className="size-1.5 rounded-full bg-emerald-500"></span>
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              <span className="size-1.5 rounded-full bg-slate-400"></span>
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#64748b]">{lesson.modules} {lesson.modules === 1 ? 'module' : 'modules'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/lessons/${params.level}/${lesson.id}/edit`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          <span>Edit</span>
                        </Link>
                        <Link
                          href={`/lessons/${params.level}/${lesson.id}/present`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">present_to_all</span>
                          <span>Present</span>
                        </Link>
                      </div>
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
