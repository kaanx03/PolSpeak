"use client";

import { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { createLessonContent } from "@/lib/supabase-helpers";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

interface GeneratedModule {
  id: string;
  type: string;
  content: Record<string, any>;
}

interface GeneratedLesson {
  title: string;
  modules: GeneratedModule[];
}

function ModulePreview({ module }: { module: GeneratedModule }) {
  const typeColors: Record<string, string> = {
    text: "bg-violet-50 border-violet-200",
    vocabulary: "bg-emerald-50 border-emerald-200",
    quiz: "bg-blue-50 border-blue-200",
    truefalse: "bg-amber-50 border-amber-200",
    matching: "bg-rose-50 border-rose-200",
    fillblank: "bg-cyan-50 border-cyan-200",
    youtube: "bg-red-50 border-red-200",
    wordwall: "bg-orange-50 border-orange-200",
  };
  const typeIcons: Record<string, string> = {
    text: "article",
    vocabulary: "spellcheck",
    quiz: "quiz",
    truefalse: "rule",
    matching: "compare_arrows",
    fillblank: "edit",
    youtube: "smart_display",
    wordwall: "sports_esports",
  };
  const typeLabels: Record<string, string> = {
    text: "Text",
    vocabulary: "Vocabulary",
    quiz: "Quiz",
    truefalse: "True / False",
    matching: "Matching",
    fillblank: "Fill in the Blank",
    youtube: "YouTube Video",
    wordwall: "Wordwall Game",
  };

  const colorClass = typeColors[module.type] || "bg-slate-50 border-slate-200";
  const icon = typeIcons[module.type] || "widgets";
  const label = typeLabels[module.type] || module.type;
  const c = module.content;

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-slate-500">
          {icon}
        </span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>

      {module.type === "text" && (
        <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">
          {c.text}
        </p>
      )}

      {module.type === "vocabulary" && (
        <div>
          {c.vocabularyTitle && (
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {c.vocabularyTitle}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {(c.vocabularyItems || []).slice(0, 4).map((item: any) => (
              <div key={item.id} className="flex gap-2 text-sm">
                <span className="font-medium text-slate-800 min-w-[80px]">
                  {item.word}
                </span>
                <span className="text-slate-500">{item.definition}</span>
              </div>
            ))}
            {(c.vocabularyItems || []).length > 4 && (
              <span className="text-xs text-slate-400">
                +{c.vocabularyItems.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {module.type === "quiz" && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            {c.question}
          </p>
          <div className="flex flex-col gap-1">
            {(c.options || []).map((opt: any, i: number) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  opt.isCorrect
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-slate-500"
                }`}
              >
                {opt.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {module.type === "truefalse" && (
        <div>
          {c.trueFalseTitle && (
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {c.trueFalseTitle}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {(c.trueFalseStatements || []).slice(0, 3).map((s: any) => (
              <div key={s.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`text-xs font-bold mt-0.5 ${
                    s.isTrue ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {s.isTrue ? "T" : "F"}
                </span>
                <span className="text-slate-600">{s.statement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {module.type === "matching" && (
        <div className="flex flex-col gap-1">
          {(c.pairs || []).slice(0, 4).map((pair: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">{pair.left}</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400">
                arrow_forward
              </span>
              <span className="text-slate-500">{pair.right}</span>
            </div>
          ))}
        </div>
      )}

      {module.type === "fillblank" && (
        <div>
          <p className="text-sm text-slate-700 mb-1">{c.sentence}</p>
          <p className="text-xs text-slate-500">
            Answers: {(c.answers || []).join(", ")}
          </p>
        </div>
      )}

      {module.type === "youtube" && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_display</span>
          <a href={c.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 underline truncate">
            {c.youtubeTitle || c.youtubeUrl}
          </a>
        </div>
      )}

      {module.type === "wordwall" && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
          <a href={c.wordwallUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 underline truncate">
            {c.wordwallUrl}
          </a>
        </div>
      )}
    </div>
  );
}

export default function AIPage() {
  const [prompt, setPrompt] = useState("");
  const [level, setLevel] = useState("a1");
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [parseError, setParseError] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setLesson(null);
    setRawJson("");
    setParseError(false);
    setStatusMsg("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, level }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("API request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.status) setStatusMsg(parsed.status);
            if (parsed.text) {
              accumulated += parsed.text;
              setRawJson(accumulated);
            }
          } catch {}
        }
      }

      // Parse the final JSON
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as GeneratedLesson;
          setLesson(parsed);
        } catch {
          setParseError(true);
        }
      } else {
        setParseError(true);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        showToast("Generation failed. Please try again.", "error");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!lesson) return;
    setSaving(true);
    try {
      const created = await createLessonContent({
        title: lesson.title,
        level: level as any,
        status: "draft",
        modules: lesson.modules,
      });
      showToast("Lesson saved as draft!", "success");
      router.push(`/lessons/${level}/${created.id}/edit`);
    } catch {
      showToast("Failed to save lesson.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 pb-24 xl:pb-6">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="material-symbols-outlined text-indigo-500 text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <h1 className="text-2xl font-bold text-slate-900">
                  AI Lesson Generator
                </h1>
              </div>
              <p className="text-slate-500 text-sm ml-10">
                Describe the lesson you want and let AI build it for you.
              </p>
            </div>

            {/* Input card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Level
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold uppercase transition-colors ${
                          level === l
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Present simple tense with daily routines, colors and adjectives, food vocabulary for beginners..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        handleGenerate();
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Ctrl+Enter to generate
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={generating ? handleStop : handleGenerate}
                    disabled={!prompt.trim() && !generating}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      generating
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={
                        !generating
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {generating ? "stop" : "auto_awesome"}
                    </span>
                    {generating ? "Stop" : "Generate Lesson"}
                  </button>

                  {lesson && !generating && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        save
                      </span>
                      {saving ? "Saving..." : "Save as Draft"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Streaming indicator */}
            {generating && (
              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-6 text-indigo-700 text-sm">
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                {statusMsg || "Starting…"}
                {rawJson.length > 0 && (
                  <span className="text-indigo-400 ml-1">
                    ({rawJson.length} chars)
                  </span>
                )}
              </div>
            )}

            {/* Parse error */}
            {parseError && !generating && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-6 text-red-600 text-sm">
                <span className="material-symbols-outlined text-[18px]">
                  error
                </span>
                Could not parse the generated lesson. Try generating again.
              </div>
            )}

            {/* Generated lesson preview */}
            {lesson && !generating && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {lesson.title}
                  </h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase font-semibold">
                    {level}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {lesson.modules.map((mod, i) => (
                    <ModulePreview key={mod.id || i} module={mod} />
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    {saving ? "Saving..." : "Save as Draft"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
