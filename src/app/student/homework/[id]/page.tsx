"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadFile, deleteFile, type StudentHomework, type HomeworkFile } from "@/lib/supabase-helpers";
import PdfViewer from "@/components/PdfViewer";

function getStatusInfo(hw: StudentHomework) {
  if (hw.status === "graded") return { label: "Graded", cls: "bg-emerald-100 text-emerald-700" };
  if (hw.status === "submitted") return { label: "Submitted", cls: "bg-blue-100 text-blue-700" };
  if (hw.due_date && new Date(hw.due_date) < new Date()) return { label: "Overdue", cls: "bg-red-100 text-red-600" };
  return { label: "Pending", cls: "bg-amber-100 text-amber-700" };
}

export default function HomeworkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const hwId = params.id as string;

  const [hw, setHw] = useState<StudentHomework | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission state
  const fileRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File[]>([]);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    loadHw();
  }, [hwId]);

  const loadHw = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const { data: studentRecord } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!studentRecord) { router.replace("/"); return; }
      setStudentId(studentRecord.id);

      const { data, error: hwError } = await supabase
        .from("student_homework")
        .select("*")
        .eq("id", hwId)
        .eq("student_id", studentRecord.id)
        .single();

      if (hwError || !data) { setError("Homework not found."); setLoading(false); return; }
      setHw(data);
      setNote(data.student_note || "");
    } catch {
      setError("Failed to load homework.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilesStaged = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    if (fileRef.current) fileRef.current.value = "";
    setStaged((prev) => [...prev, ...files]);
  };

  const markRemoved = (idx: number) => {
    setRemovedIndices((prev) => new Set([...prev, idx]));
    setConfirmRemove(null);
  };

  const noteChanged = note !== (hw?.student_note || "");
  const canSubmit = hw?.status !== "graded";
  const isSubmitEnabled =
    staged.length > 0 || removedIndices.size > 0 || noteChanged;

  const handleSubmit = async () => {
    if (!hw || !studentId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded: HomeworkFile[] = [];
      for (const file of staged) {
        const result = await uploadFile(file, `homework/student/${studentId}`);
        uploaded.push({ url: result.url, name: file.name, type: file.type, storagePath: result.storagePath });
      }

      const existingAll = hw.student_files || [];
      const existingKept = existingAll.filter((_, i) => !removedIndices.has(i));

      for (const idx of removedIndices) {
        const f = existingAll[idx];
        if (f?.storagePath) deleteFile(f.storagePath).catch(() => {});
      }

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/homework/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          homeworkId: hw.id,
          files: uploaded,
          existingFiles: existingKept,
          note: note || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submit failed");

      setHw(json.data);
      setStaged([]);
      setRemovedIndices(new Set());
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="size-8 border-4 border-navy-dark border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !hw) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">{error || "Not found."}</p>
        <button onClick={() => router.back()} className="text-sm text-navy-dark underline">Go back</button>
      </div>
    );
  }

  const info = getStatusInfo(hw);
  const teacherFiles = hw.teacher_files || [];
  const teacherLinks = (hw as any).teacher_links as { url: string; label: string }[] || [];
  const studentFiles = hw.student_files || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 size-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-white text-xl">close</span>
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-slate-600 text-xl">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy-dark text-sm truncate">{hw.title}</p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${info.cls}`}>{info.label}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Meta */}
        {(hw.description || hw.due_date) && (
          <div className="space-y-1.5">
            {hw.description && (
              <p className="text-slate-600 text-sm leading-relaxed">{hw.description}</p>
            )}
            {hw.due_date && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Due: {new Date(hw.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        {/* Teacher files — presentation style */}
        {teacherFiles.length > 0 && (
          <div className="space-y-5">
            {teacherFiles.map((f, i) => {
              const isPdf = f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf");
              const isImage = f.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name || "");
              if (isPdf) {
                return (
                  <div key={i}>
                    <p className="text-xs font-medium text-slate-500 mb-2">{f.name}</p>
                    <PdfViewer url={f.url} className="h-[500px] lg:h-[650px]" />
                  </div>
                );
              }
              if (isImage) {
                return (
                  <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={f.url}
                      alt={f.name}
                      onClick={() => setLightbox(f.url)}
                      className="w-full h-auto object-contain max-h-[700px] cursor-pointer"
                    />
                    {f.name && (
                      <p className="text-xs text-slate-400 text-center py-2 px-3">{f.name}</p>
                    )}
                  </div>
                );
              }
              return (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group text-sm shadow-sm"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 text-xl transition-colors">description</span>
                  <span className="text-slate-700 flex-1 truncate font-medium">{f.name}</span>
                  <span className="material-symbols-outlined text-slate-400 text-base">download</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Teacher links */}
        {teacherLinks.length > 0 && (
          <div className="space-y-2">
            {teacherLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group text-sm shadow-sm"
              >
                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 text-xl transition-colors">link</span>
                <span className="text-slate-700 flex-1 truncate font-medium">{link.label}</span>
                <span className="material-symbols-outlined text-slate-400 text-base">open_in_new</span>
              </a>
            ))}
          </div>
        )}

        {/* Grade */}
        {hw.grade && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <span className="text-sm font-semibold text-emerald-700 mr-1">Grade:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`material-symbols-outlined text-2xl ${parseInt(hw.grade!) >= star ? "text-amber-400" : "text-slate-300"}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
            ))}
          </div>
        )}

        {/* Divider before submission */}
        <div className="border-t border-slate-200" />

        {/* Graded read-only submission */}
        {!canSubmit && (studentFiles.length > 0 || hw.student_note) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your submission</p>
            {hw.student_note && (
              <div className="px-4 py-3 bg-blue-50 rounded-2xl border border-blue-200 text-sm text-blue-700 leading-relaxed">
                <span className="font-semibold block mb-0.5 text-xs">Note:</span>
                {hw.student_note}
              </div>
            )}
            {studentFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 rounded-2xl border border-blue-200 text-sm">
                <span className="material-symbols-outlined text-blue-500 text-xl">upload_file</span>
                <span className="text-blue-700 flex-1 truncate font-medium">{f.name}</span>
                <span className="text-blue-400 text-xs font-medium">Submitted</span>
              </div>
            ))}
          </div>
        )}

        {/* Editable submission */}
        {canSubmit && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {studentFiles.length > 0 ? "Your submission" : "Submit homework"}
            </p>

            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.mp4,.zip"
              onChange={(e) => handleFilesStaged(e.target.files)}
              className="hidden"
            />

            {/* Already submitted files */}
            {studentFiles.map((f, i) => {
              if (removedIndices.has(i)) return null;
              const isConfirming = confirmRemove === i;
              return (
                <div key={i} className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm transition-all ${isConfirming ? "bg-red-50 border-red-300" : "bg-blue-50 border-blue-200"}`}>
                  <span className="material-symbols-outlined text-blue-500 text-xl">upload_file</span>
                  <span className="text-blue-700 flex-1 truncate font-medium">{f.name}</span>
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-red-600 font-semibold text-xs">Remove?</span>
                      <button onClick={() => setConfirmRemove(null)} className="h-6 px-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50">No</button>
                      <button onClick={() => markRemoved(i)} className="h-6 px-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold">Yes</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRemove(i)} className="text-blue-300 hover:text-red-500 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </div>
              );
            })}

            {/* Staged files */}
            {staged.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-sm">
                <span className="material-symbols-outlined text-indigo-500 text-xl">draft</span>
                <span className="text-indigo-700 flex-1 truncate font-medium">{f.name}</span>
                <button onClick={() => setStaged((prev) => prev.filter((_, j) => j !== i))} className="text-indigo-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            ))}

            {/* Note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note to your teacher... (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-navy-dark outline-none resize-none shadow-sm"
            />

            {submitError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="material-symbols-outlined text-base">error</span>
                {submitError}
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
                className="flex items-center gap-1.5 h-12 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors disabled:opacity-60 border border-slate-200 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">attach_file</span>
                Add files
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !isSubmitEnabled}
                className="flex-1 h-12 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2 bg-navy-dark hover:bg-navy-light text-white disabled:opacity-40 shadow-sm"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">send</span>
                    {studentFiles.length > 0 ? "Save changes" : "Submit"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
