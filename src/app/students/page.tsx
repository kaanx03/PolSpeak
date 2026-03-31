"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchStudents, fetchGroups, createStudent, createGroup, fetchAllLessonHistory, Student as DbStudent, Group as DbGroup } from "@/lib/supabase-helpers";
import { supabase } from "@/lib/supabase";

interface Student {
  id: string;
  name: string;
  initials: string;
  color: string;
  level: string;
  status: "active" | "paused";
  groupId?: string; // If student belongs to a group
  email?: string;
  phone?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  notes?: string;
  recurringSchedule?: {
    day: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  homework: Homework[];
  topicsCovered: string[];
  customTopics: string[];
  payments: Payment[];
  lessonHistory: LessonHistoryEntry[];
}

interface Group {
  id: string;
  name: string;
  level: string;
  color: string;
  studentIds: string[];
  recurringSchedule?: {
    day: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  notes?: string;
}

interface Homework {
  id: string;
  date: string;
  description: string;
  completed: boolean;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: string;
  type: "lesson" | "package" | "trial";
  status: "paid" | "pending" | "overdue";
  notes?: string;
}

interface LessonHistoryEntry {
  id: string;
  date: string;
  lessonId?: string;
  lessonTitle: string;
  duration: number;
  notes?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<"individual" | "groups">("individual");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);

  const copyToClipboard = (text: string, field: "email" | "password") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Fetch all data in parallel with a single query for lesson history (prevents N+1 problem)
    const [studentsData, groupsData, allLessonHistory] = await Promise.all([
      fetchStudents(),
      fetchGroups(),
      fetchAllLessonHistory()
    ]);

    // Map database fields to frontend fields
    const mappedStudents = studentsData.map((s: DbStudent) => {
      // Filter lesson history for this student (client-side filtering instead of N+1 queries)
      const studentHistory = allLessonHistory.filter((h: any) => h.student_id === s.id);

      return {
        id: s.id,
        name: s.name,
        initials: s.initials,
        color: s.color,
        level: s.level,
        status: s.status,
        groupId: s.group_id,
        email: s.email,
        phone: s.phone,
        parentName: s.parent_name,
        parentEmail: s.parent_email,
        parentPhone: s.parent_phone,
        notes: s.notes,
        recurringSchedule: s.recurring_schedule,
        homework: s.homework || [],
        topicsCovered: s.topics_covered || [],
        customTopics: s.custom_topics || [],
        payments: s.payments || [],
        lessonHistory: studentHistory.map((h: any) => ({
          id: h.id,
          date: h.date,
          lessonId: h.lesson_id,
          lessonTitle: h.topic,
          duration: h.duration,
          notes: h.notes,
        })),
      };
    });

    const mappedGroups = groupsData.map((g: DbGroup) => ({
      id: g.id,
      name: g.name,
      level: g.level,
      color: g.color,
      description: g.description,
      recurringSchedule: g.recurring_schedule,
      notes: g.notes,
      studentIds: [], // Will be calculated from students
    }));

    setStudents(mappedStudents);
    setGroups(mappedGroups);
  };


  const handleStudentClick = (studentId: string) => {
    router.push(`/students/${studentId}`);
  };

  const handleGroupClick = (groupId: string) => {
    router.push(`/students/groups/${groupId}`);
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      a1: "bg-emerald-50 text-emerald-700 border-emerald-100",
      a2: "bg-blue-50 text-blue-700 border-blue-100",
      b1: "bg-indigo-50 text-indigo-700 border-indigo-100",
      b2: "bg-purple-50 text-purple-700 border-purple-100",
      c1: "bg-rose-50 text-rose-700 border-rose-100",
    };
    return colors[level.toLowerCase()] || "bg-slate-50 text-slate-700 border-slate-100";
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      a1: "A1 Beginner",
      a2: "A2 Elementary",
      b1: "B1 Intermediate",
      b2: "B2 Upper Int.",
      c1: "C1 Advanced",
    };
    return labels[level.toLowerCase()] || level.toUpperCase();
  };

  const individualStudents = students.filter((s) => !s.groupId);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-3 md:px-6 py-4 md:py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight truncate">
                  Students
                </h2>
                <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                  Manage your students and groups
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  <span>New Group</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#00132c] hover:bg-[#0f2545] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4 md:mt-6">
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Total Students</p>
                <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">{students.length}</p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Active</p>
                <p className="text-lg md:text-xl font-bold text-emerald-600 mt-0.5">
                  {students.filter((s) => s.status === "active").length}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Individual</p>
                <p className="text-lg md:text-xl font-bold text-indigo-600 mt-0.5">
                  {individualStudents.length}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Groups</p>
                <p className="text-lg md:text-xl font-bold text-blue-600 mt-0.5">
                  {groups.length}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab("individual")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === "individual"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                Individual ({individualStudents.length})
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === "groups"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                Groups ({groups.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Individual Students Tab */}
            {activeTab === "individual" && (
              <>
                {individualStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl text-slate-400">person</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#1e293b] mb-2">No individual students yet</h3>
                    <p className="text-slate-500 text-sm mb-4">
                      Add your first student to start tracking their progress
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Add Student
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {individualStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => handleStudentClick(student.id)}
                        className="bg-white rounded-lg border-2 border-slate-200 hover:border-indigo-400 hover:shadow-lg p-4 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={`size-12 rounded-full ${student.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                          >
                            {student.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                              {student.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(
                                  student.level
                                )}`}
                              >
                                {getLevelLabel(student.level)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                  student.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    student.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                ></span>
                                {student.status === "active" ? "Active" : "Paused"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-100">
                          <div>
                            <p className="text-xs text-slate-500">Lessons</p>
                            <p className="text-sm font-bold text-slate-900">
                              {student.lessonHistory?.length || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Homework</p>
                            <p className="text-sm font-bold text-amber-600">
                              {student.homework?.filter((h) => !h.completed).length || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Topics</p>
                            <p className="text-sm font-bold text-indigo-600">
                              {(student.topicsCovered?.length || 0) + (student.customTopics?.length || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Groups Tab */}
            {activeTab === "groups" && (
              <>
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl text-blue-600">groups</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#1e293b] mb-2">No groups yet</h3>
                    <p className="text-slate-500 text-sm mb-4">
                      Create your first group to organize group lessons
                    </p>
                    <button
                      onClick={() => setShowAddGroupModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Create Group
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {groups.map((group) => {
                      const groupStudents = students.filter((s) => s.groupId === group.id);
                      return (
                        <div
                          key={group.id}
                          onClick={() => handleGroupClick(group.id)}
                          className="bg-white rounded-lg border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg p-4 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className={`size-12 rounded-full ${group.color} flex items-center justify-center text-white flex-shrink-0`}
                            >
                              <span className="material-symbols-outlined text-2xl">groups</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {group.name}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(
                                    group.level
                                  )}`}
                                >
                                  {getLevelLabel(group.level)}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                  {groupStudents.length} students
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Group Students Preview */}
                          {groupStudents.length > 0 && (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="flex -space-x-2">
                                {groupStudents.slice(0, 5).map((student) => (
                                  <div
                                    key={student.id}
                                    className={`size-8 rounded-full ${student.color} flex items-center justify-center text-white text-xs font-bold border-2 border-white`}
                                    title={student.name}
                                  >
                                    {student.initials}
                                  </div>
                                ))}
                                {groupStudents.length > 5 && (
                                  <div className="size-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold border-2 border-white">
                                    +{groupStudents.length - 5}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Student Created - Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-emerald-600 text-3xl">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Student Created!</h3>
              <p className="text-slate-500 text-sm mt-1">Share these login credentials with the student.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Email</span>
                <span className="text-sm font-mono text-slate-800 truncate flex-1">{createdCredentials.email}</span>
              </div>
              <div className="border-t border-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Password</span>
                <span className="text-sm font-mono text-slate-800 flex-1">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
                  setCopiedField("email");
                  setTimeout(() => setCopiedField(null), 2000);
                }}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedField === "email" ? "check" : "content_copy"}
                </span>
                {copiedField === "email" ? "Copied!" : "Copy All"}
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="flex-1 h-11 bg-navy-dark hover:bg-navy-light text-white font-semibold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onSave={async (student, password) => {
            const email = student.name.trim().toLowerCase().replace(/\s+/g, '.') + '@polspeak.com';
            try {
              // 1. Create student record in DB
              const created = await createStudent({
                name: student.name,
                initials: student.initials,
                color: student.color,
                level: student.level,
                status: student.status,
                group_id: student.groupId,
                email,
                phone: student.phone,
                parent_name: student.parentName,
                parent_email: student.parentEmail,
                parent_phone: student.parentPhone,
                notes: student.notes,
                recurring_schedule: student.recurringSchedule,
                homework: student.homework || [],
                topics_covered: student.topicsCovered || [],
                custom_topics: student.customTopics || [],
                payments: student.payments || [],
              });

              // 2. Create Supabase auth account and link
              const { data: { session: teacherSession } } = await supabase.auth.getSession();
              const res = await fetch('/api/student-auth/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(teacherSession?.access_token ? { Authorization: `Bearer ${teacherSession.access_token}` } : {}),
                },
                body: JSON.stringify({
                  email,
                  password,
                  studentId: created.id,
                  studentName: student.name,
                }),
              });

              const result = await res.json();
              await loadData();
              setShowAddModal(false);
              if (res.ok) {
                setCreatedCredentials({ email: result.email || email, password });
              } else {
                console.error('Auth setup error:', result.error);
                alert(`Student record created but login account failed: ${result.error}`);
              }
            } catch (error) {
              console.error('Failed to create student:', error);
            }
          }}
        />
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <AddGroupModal
          onClose={() => setShowAddGroupModal(false)}
          onSave={async (group) => {
            try {
              await createGroup({
                name: group.name,
                level: group.level,
                color: group.color,
                description: group.notes,
                recurring_schedule: group.recurringSchedule,
                notes: group.notes,
              });
              await loadData(); // Reload data
              setShowAddGroupModal(false);
            } catch (error) {
              console.error('Failed to create group:', error);
              alert('Failed to create group. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}

// Add Student Modal
function AddStudentModal({
  groups,
  onClose,
  onSave,
}: {
  groups: Group[];
  onClose: () => void;
  onSave: (student: Student, password: string) => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("a1");
  const [groupId, setGroupId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const generateInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const generateColor = () => {
    const colors = [
      "bg-indigo-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-rose-500",
      "bg-orange-500",
      "bg-emerald-500",
      "bg-cyan-500",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Convert name to email: "John Smith" → "john.smith@polspeak.com"
  const nameToEmail = (n: string) =>
    n.trim().toLowerCase().replace(/\s+/g, ".") + "@polspeak.com";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      name: name.trim(),
      initials: generateInitials(name),
      color: generateColor(),
      level,
      groupId: groupId || undefined,
      status: "active",
      homework: [],
      topicsCovered: [],
      customTopics: [],
      payments: [],
      lessonHistory: [],
    };

    onSave(newStudent, password);
  };

  const previewEmail = name.trim() ? nameToEmail(name) : "name@polspeak.com";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Add New Student</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-600 text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="John Smith"
              required
            />
            {name.trim() && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">alternate_email</span>
                Login email: <span className="font-mono font-medium text-indigo-600">{previewEmail}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Student Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              placeholder="Min. 6 characters"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-1">
              Share this password with the student — they use it to log in.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              <option value="a1">A1 Beginner</option>
              <option value="a2">A2 Elementary</option>
              <option value="b1">B1 Intermediate</option>
              <option value="b2">B2 Upper Intermediate</option>
              <option value="c1">C1 Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Group (Optional)
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              <option value="">Individual (No Group)</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} - {group.level.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select a group if this student takes group lessons
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Group Modal
function AddGroupModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (group: Group) => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("a1");
  const [error, setError] = useState("");

  const generateColor = () => {
    const colors = [
      "bg-indigo-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-rose-500",
      "bg-orange-500",
      "bg-emerald-500",
      "bg-cyan-500",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter group name");
      return;
    }

    const newGroup: Group = {
      id: Date.now().toString(),
      name: name.trim(),
      level,
      color: generateColor(),
      studentIds: [],
    };

    onSave(newGroup);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Create New Group</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-600 text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Morning Group, Evening Advanced"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="a1">A1 Beginner</option>
              <option value="a2">A2 Elementary</option>
              <option value="b1">B1 Intermediate</option>
              <option value="b2">B2 Upper Intermediate</option>
              <option value="c1">C1 Advanced</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
