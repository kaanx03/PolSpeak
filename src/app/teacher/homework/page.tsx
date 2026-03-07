"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchStudents,
  fetchAllStudentHomework,
  createStudentHomework,
  updateStudentHomework,
  deleteStudentHomework,
  gradeHomework,
  uploadFile,
  deleteFile,
  type Student,
  type StudentHomework,
  type HomeworkFile,
} from "@/lib/supabase-helpers";

export default function HomeworkPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [homework, setHomework] = useState<StudentHomework[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingHw, setEditingHw] = useState<StudentHomework | null>(null);
  const [form, setForm] = useState({ student_id: "", title: "", description: "", due_date: "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");

  const [filterStudent, setFilterStudent] = useState("all");
  const [expandedHw, setExpandedHw] = useState<Set<string>>(new Set());

  const toggleHw = (id: string) => {
    setExpandedHw((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [s, hw] = await Promise.all([fetchStudents(), fetchAllStudentHomework()]);
    setStudents(s);
    setHomework(hw);
    setLoading(false);
  };

  const getStudentName = (id: string) =>
    students.find((s) => s.id === id)?.name || "Unknown";

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const filteredHomework =
    filterStudent === "all"
      ? homework
      : homework.filter((hw) => hw.student_id === filterStudent);

  const resetForm = () => {
    setForm({ student_id: "", title: "", description: "", due_date: "" });
    setSelectedFiles([]);
    setEditingHw(null);
    setShowForm(false);
  };

  const openEdit = (hw: StudentHomework) => {
    setEditingHw(hw);
    setForm({
      student_id: hw.student_id,
      title: hw.title,
      description: hw.description || "",
      due_date: hw.due_date ? hw.due_date.slice(0, 10) : "",
    });
    setSelectedFiles([]);
    setShowForm(true);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.title) return;

    setUploading(true);
    try {
      const uploadedFiles: HomeworkFile[] = [];
      for (const file of selectedFiles) {
        const result = await uploadFile(file, `homework/teacher/${form.student_id}`);
        uploadedFiles.push({ url: result.url, name: file.name, type: file.type, storagePath: result.storagePath });
      }

      if (editingHw) {
        const existingFiles = editingHw.teacher_files || [];
        await updateStudentHomework(editingHw.id, {
          student_id: form.student_id,
          title: form.title,
          description: form.description || undefined,
          teacher_files: [...existingFiles, ...uploadedFiles],
          due_date: form.due_date || undefined,
        });
        showToast("Homework updated!", "success");
      } else {
        await createStudentHomework({
          student_id: form.student_id,
          title: form.title,
          description: form.description || undefined,
          type: uploadedFiles.length > 0 ? "file" : "lesson",
          teacher_files: uploadedFiles,
          due_date: form.due_date || undefined,
          status: "pending",
        });
        showToast("Homework assigned!", "success");
      }

      resetForm();
      loadData();
    } catch {
      showToast("Failed to save homework.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const hw = homework.find((h) => h.id === id);
      if (hw) {
        const allFiles = [...(hw.teacher_files || []), ...(hw.student_files || [])];
        for (const file of allFiles) {
          if (file.storagePath) {
            try { await deleteFile(file.storagePath); } catch { /* continue if one fails */ }
          }
        }
      }
      await deleteStudentHomework(id);
      setHomework((prev) => prev.filter((h) => h.id !== id));
      setConfirmDeleteId(null);
      showToast("Homework removed.", "success");
    } catch {
      showToast("Failed to delete homework.", "error");
    }
  };

  const handleGradeSave = async (id: string) => {
    try {
      await gradeHomework(id, gradeInput);
      setHomework((prev) =>
        prev.map((hw) => hw.id === id ? { ...hw, grade: gradeInput, status: "graded" } : hw)
      );
      setGradingId(null);
      showToast("Grade saved!", "success");
    } catch {
      showToast("Failed to save grade.", "error");
    }
  };

  const getStatusBadge = (hw: StudentHomework) => {
    const status = hw.status || "pending";
    const isLate = hw.submitted_at && hw.due_date && new Date(hw.submitted_at) > new Date(hw.due_date);
    if (status === "graded") return { label: "Graded", cls: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" };
    if (status === "submitted") return { label: isLate ? "Late" : "Submitted", cls: isLate ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700", border: isLate ? "border-l-orange-400" : "border-l-blue-400" };
    const isOverdue = hw.due_date && new Date(hw.due_date) < new Date() && status === "pending";
    if (isOverdue) return { label: "Overdue", cls: "bg-red-100 text-red-600", border: "border-l-red-400" };
    return { label: "Pending", cls: "bg-amber-100 text-amber-700", border: "border-l-amber-400" };
  };

  const activeStudents = students.filter((s) => s.status === "active");

  // Stats
  const totalCount = homework.length;
  const pendingCount = homework.filter((h) => !h.status || h.status === "pending").length;
  const submittedCount = homework.filter((h) => h.status === "submitted").length;
  const gradedCount = homework.filter((h) => h.status === "graded").length;

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* Header */}
          <div className="flex flex-col wide:flex-row wide:items-center wide:justify-between gap-3 mb-6 wide:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy-dark">Homework</h1>
              <p className="text-text-muted text-xs sm:text-sm mt-1">Assign and track homework for your students</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 h-10 px-5 bg-navy-dark hover:bg-navy-light text-white font-semibold rounded-xl transition-colors shadow-sm w-fit"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Assign Homework
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: "Total", value: totalCount, icon: "assignment", color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-100" },
              { label: "Pending", value: pendingCount, icon: "hourglass_empty", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" },
              { label: "Submitted", value: submittedCount, icon: "task_alt", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" },
              { label: "Graded", value: gradedCount, icon: "workspace_premium", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className={`size-9 sm:size-12 rounded-xl ${stat.bg} ring-4 ${stat.ring} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${stat.color} text-lg sm:text-2xl`}>{stat.icon}</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-navy-dark">{stat.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="material-symbols-outlined text-slate-400 text-lg shrink-0">filter_list</span>
              <select
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                className="h-9 pl-2 pr-8 rounded-xl bg-white border border-slate-200 text-sm text-navy-dark focus:ring-2 focus:ring-navy-dark outline-none min-w-0 flex-1 sm:flex-none"
              >
                <option value="all">All Students</option>
                {activeStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <span className="text-xs sm:text-sm text-slate-400 font-medium shrink-0">
              {filteredHomework.length} assignment{filteredHomework.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Assignment List */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="size-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredHomework.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <div className="size-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-amber-400 text-4xl">assignment</span>
              </div>
              <p className="text-slate-800 font-semibold text-lg mb-2">No homework assigned yet</p>
              <p className="text-slate-400 text-sm">Click "Assign Homework" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHomework.map((hw) => {
                const badge = getStatusBadge(hw);
                const teacherFiles = hw.teacher_files || [];
                const studentFiles = hw.student_files || [];
                const isLate = hw.submitted_at && hw.due_date && new Date(hw.submitted_at) > new Date(hw.due_date);
                const hasSubmission = hw.status === "submitted" || hw.status === "graded";
                const studentName = getStudentName(hw.student_id);

                const isExpanded = expandedHw.has(hw.id);

                return (
                  <div key={hw.id} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${badge.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                    {/* Collapsed header — always visible, clickable to expand */}
                    <div
                      className="p-4 sm:p-5 flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => toggleHw(hw.id)}
                    >
                      {/* Student avatar */}
                      <div className="size-9 sm:size-10 rounded-xl bg-navy-dark flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">{getInitials(studentName)}</span>
                      </div>

                      {/* Title + student + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-bold text-navy-dark text-sm sm:text-base">{hw.title}</p>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-xs sm:text-sm text-indigo-600 font-medium">{studentName}</p>
                          {hw.due_date && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              {new Date(hw.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {teacherFiles.length > 0 && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">attach_file</span>
                              {teacherFiles.length}
                            </span>
                          )}
                          {hw.grade && (
                            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <span className="material-symbols-outlined text-sm">workspace_premium</span>
                              {hw.grade}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions + chevron */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {confirmDeleteId === hw.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2 py-1.5">
                            <span className="text-xs text-red-700 font-medium hidden sm:inline">Delete?</span>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-7 px-2 sm:px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                            >
                              No
                            </button>
                            <button
                              onClick={() => handleDelete(hw.id)}
                              className="h-7 px-2 sm:px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                            >
                              Yes
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(hw)}
                              className="size-8 sm:size-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-slate-500 text-base">edit</span>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(hw.id)}
                              className="size-8 sm:size-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-red-500 text-base">delete</span>
                            </button>
                          </>
                        )}
                      </div>
                      <span className={`material-symbols-outlined text-slate-400 text-xl shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <>
                        {(hw.description || teacherFiles.length > 0) && (
                          <div className="px-4 sm:px-5 pb-4 ml-12 sm:ml-13 space-y-3">
                            {hw.description && (
                              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">{hw.description}</p>
                            )}
                            {teacherFiles.length > 0 && (
                              <div className="grid grid-cols-1 gap-1.5">
                                {teacherFiles.map((f, i) => (
                                  <a
                                    key={i}
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group text-xs"
                                  >
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 text-base transition-colors">description</span>
                                    <span className="text-slate-600 flex-1 truncate font-medium">{f.name}</span>
                                    <span className="material-symbols-outlined text-slate-400 text-sm">open_in_new</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Submission section */}
                        {hasSubmission && (
                          <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-50 px-4 sm:px-5 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="size-6 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-500 text-sm">upload</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Student Submission</span>
                              {hw.submitted_at && (
                                <span className="text-xs text-slate-400 ml-1">
                                  · {new Date(hw.submitted_at).toLocaleDateString("en-GB", {
                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                  })}
                                </span>
                              )}
                              {isLate && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 ml-auto">Late</span>
                              )}
                            </div>

                            {hw.student_note && (
                              <div className="mb-3 px-3 py-2.5 bg-white rounded-xl border border-blue-200 text-xs text-slate-700 leading-relaxed">
                                <span className="font-semibold text-slate-500 block mb-0.5">Student note:</span>
                                {hw.student_note}
                              </div>
                            )}

                            {studentFiles.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1.5 mb-4">
                                {studentFiles.map((f, i) => (
                                  <a
                                    key={i}
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group text-xs"
                                  >
                                    <span className="material-symbols-outlined text-blue-400 text-base">upload_file</span>
                                    <span className="text-slate-600 flex-1 truncate font-medium">{f.name}</span>
                                    <span className="material-symbols-outlined text-slate-400 text-sm">open_in_new</span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 mb-4 italic">No files submitted.</p>
                            )}

                            {/* Grading */}
                            {gradingId === hw.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={gradeInput}
                                  onChange={(e) => setGradeInput(e.target.value)}
                                  placeholder="e.g. 85/100 or A+"
                                  className="flex-1 h-9 px-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark outline-none"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGradeSave(hw.id); } }}
                                />
                                <button
                                  onClick={() => handleGradeSave(hw.id)}
                                  className="h-9 px-4 bg-navy-dark text-white text-xs font-bold rounded-xl hover:bg-navy-light transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setGradingId(null)}
                                  className="h-9 px-3 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {hw.grade && (
                                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                                    <span className="material-symbols-outlined text-emerald-500 text-base">workspace_premium</span>
                                    <span className="text-sm font-bold text-emerald-700">{hw.grade}</span>
                                  </div>
                                )}
                                <button
                                  onClick={() => { setGradingId(hw.id); setGradeInput(hw.grade || ""); }}
                                  className="h-9 px-4 bg-navy-dark hover:bg-navy-light text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-sm">grade</span>
                                  {hw.grade ? "Edit Grade" : "Add Grade"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-navy-dark/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-navy-dark text-lg">assignment</span>
                </div>
                <h2 className="text-lg font-bold text-navy-dark">
                  {editingHw ? "Edit Homework" : "Assign Homework"}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-slate-500 text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark outline-none"
                  required
                >
                  <option value="">Select a student...</option>
                  {activeStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.level.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark outline-none"
                  placeholder="e.g. Read pages 10–15"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                  Instructions <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full h-20 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark outline-none resize-none"
                  placeholder="Add instructions or notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                  Due Date <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-dark mb-1.5">Attachments</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.mp4,.zip"
                  onChange={handleFileAdd}
                  className="hidden"
                />

                {editingHw && (editingHw.teacher_files || []).length > 0 && (
                  <div className="mb-2 space-y-1">
                    <p className="text-xs text-slate-400 font-medium mb-1">Already attached:</p>
                    {(editingHw.teacher_files || []).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="material-symbols-outlined text-slate-400 text-base">attach_file</span>
                        <span className="text-slate-600 flex-1 truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200 text-xs">
                        <span className="material-symbols-outlined text-blue-500 text-base">upload_file</span>
                        <span className="text-blue-700 flex-1 truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-blue-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 text-xl transition-colors">cloud_upload</span>
                  <div className="text-left">
                    <p className="text-sm text-slate-500 group-hover:text-indigo-600 transition-colors font-medium">Add files</p>
                    <p className="text-xs text-slate-400">PDF, DOC, PNG, JPG, MP3, MP4, ZIP</p>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 h-11 bg-navy-dark hover:bg-navy-light text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {editingHw ? "Saving..." : "Assigning..."}
                    </>
                  ) : (
                    editingHw ? "Save Changes" : "Assign"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
