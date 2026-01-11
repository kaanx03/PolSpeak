"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchGroupById, fetchStudents, fetchGroupLessonHistory, updateGroup, updateStudent, deleteGroup, Student as DbStudent, Group as DbGroup } from "@/lib/supabase-helpers";

interface LessonHistoryEntry {
  id: string;
  lessonId?: string;
  date: string;
  topic: string;
  time?: string;
  duration: number;
  notes?: string;
}

interface Student {
  id: string;
  name: string;
  initials: string;
  color: string;
  level: string;
  status: "active" | "paused";
  groupId?: string;
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
  homework: any[];
  topicsCovered: string[];
  customTopics: string[];
  payments: any[];
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
  lessonHistory?: LessonHistoryEntry[];
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    // Fetch group, students, and lesson history from Supabase
    const [groupData, studentsData, lessonHistoryData] = await Promise.all([
      fetchGroupById(groupId),
      fetchStudents(),
      fetchGroupLessonHistory(groupId)
    ]);

    if (groupData) {
      // Map database fields to frontend fields
      const mappedGroup: Group = {
        id: groupData.id,
        name: groupData.name,
        level: groupData.level,
        color: groupData.color,
        studentIds: [],
        recurringSchedule: groupData.recurring_schedule,
        notes: groupData.notes,
        lessonHistory: lessonHistoryData.map((h: any) => ({
          id: h.id,
          lessonId: h.lesson_id,
          date: h.date,
          topic: h.topic,
          time: h.time,
          duration: h.duration,
          notes: h.notes,
        })),
      };

      // Find students that belong to this group
      const studentsInGroup = studentsData.filter((s: DbStudent) => s.group_id === groupId);
      mappedGroup.studentIds = studentsInGroup.map(s => s.id);

      setGroup(mappedGroup);
    }

    // Map all students
    const allStudentsList = studentsData.map((s: DbStudent) => ({
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
      lessonHistory: [],
    }));

    setAllStudents(allStudentsList);
    setStudents(allStudentsList.filter((s) => s.groupId === groupId));
  };

  const saveGroup = async (updated: Group) => {
    try {
      await updateGroup(updated.id, {
        name: updated.name,
        level: updated.level,
        color: updated.color,
        recurring_schedule: updated.recurringSchedule,
        notes: updated.notes,
      });
      setGroup(updated);
    } catch (error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group. Please try again.');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      // Remove student's group_id in Supabase
      await updateStudent(studentId, {
        group_id: null as any
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to remove student from group:', error);
      alert('Failed to remove student. Please try again.');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      // Delete group from Supabase (CASCADE will set students' group_id to NULL)
      await deleteGroup(groupId);
      router.push("/students");
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    }
  };

  if (!group) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Group not found</p>
        </main>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      a1: "bg-emerald-50 text-emerald-700 border-emerald-200",
      a2: "bg-blue-50 text-blue-700 border-blue-200",
      b1: "bg-indigo-50 text-indigo-700 border-indigo-200",
      b2: "bg-blue-50 text-blue-700 border-purple-200",
      c1: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return colors[level.toLowerCase()] || "bg-slate-50 text-slate-700 border-slate-200";
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

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar hideProfileMenu />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-3 md:px-6 py-4 md:py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.push("/students")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600">arrow_back</span>
              </button>
              <div
                className={`size-12 rounded-full ${group.color} flex items-center justify-center text-white flex-shrink-0`}
              >
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-[#1e293b] truncate">
                  {group.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(
                      group.level
                    )}`}
                  >
                    {getLevelLabel(group.level)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {students.length} students
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Students List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Students in Group</h3>
                    <button
                      onClick={() => setShowAddStudentModal(true)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                      Add Student
                    </button>
                  </div>

                  {students.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl text-blue-600">
                          group_off
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">
                        No students in this group yet
                      </h4>
                      <p className="text-sm text-slate-500 mb-4">
                        Add students to start organizing group lessons
                      </p>
                      <button
                        onClick={() => setShowAddStudentModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Add First Student
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`size-10 rounded-full ${student.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                            >
                              {student.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900 truncate">
                                {student.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/students/${student.id}`)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                open_in_new
                              </span>
                            </button>
                            <button
                              onClick={() => handleRemoveStudent(student.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove from group"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                person_remove
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Group Info Sidebar */}
              <div className="space-y-4">
                {/* Notes */}
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Group Notes</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {group.notes || "No notes yet"}
                  </p>
                </div>

                {/* Schedule */}
                {group.recurringSchedule && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Weekly Schedule</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                        <span>
                          Every {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                            group.recurringSchedule.day
                          ]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span>
                          {group.recurringSchedule.startTime} - {group.recurringSchedule.endTime} ({group.recurringSchedule.duration} min)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Students</span>
                      <span className="text-sm font-bold text-slate-900">{students.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Active</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {students.filter((s) => s.status === "active").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Paused</span>
                      <span className="text-sm font-bold text-slate-600">
                        {students.filter((s) => s.status === "paused").length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lesson History */}
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Lesson History ({group.lessonHistory?.length || 0})
                  </h3>
                  {!group.lessonHistory || group.lessonHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">No lessons recorded yet</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {group.lessonHistory
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((lesson) => (
                          <div key={lesson.id} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="text-xs font-semibold text-slate-900">{lesson.topic}</h4>
                              <span className="text-xs text-slate-500">{lesson.duration} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-slate-500">{new Date(lesson.date).toLocaleDateString()}</p>
                              {lesson.time && (
                                <>
                                  <span className="text-xs text-slate-300">•</span>
                                  <p className="text-xs text-slate-500">{lesson.time}</p>
                                </>
                              )}
                            </div>
                            {lesson.notes && (
                              <p className="text-xs text-slate-600 mt-2 p-2 bg-white rounded border border-slate-200">
                                {lesson.notes}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Group Modal */}
      {showEditModal && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            saveGroup(updated);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <AddStudentToGroupModal
          group={group}
          availableStudents={allStudents.filter((s) => !s.groupId)}
          onClose={() => setShowAddStudentModal(false)}
          onSave={async (studentIds) => {
            try {
              // Update each student's group_id in Supabase
              await Promise.all(
                studentIds.map(studentId =>
                  updateStudent(studentId, { group_id: group.id })
                )
              );

              // Reload data
              await loadData();
              setShowAddStudentModal(false);
            } catch (error) {
              console.error('Failed to add students to group:', error);
              alert('Failed to add students. Please try again.');
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center size-12 rounded-full bg-red-100 mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Group</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Are you sure you want to delete {group.name}? Students will be moved to individual
              status. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Group Modal
function EditGroupModal({
  group,
  onClose,
  onSave,
}: {
  group: Group;
  onClose: () => void;
  onSave: (group: Group) => void;
}) {
  const [name, setName] = useState(group.name);
  const [level, setLevel] = useState(group.level);
  const [notes, setNotes] = useState(group.notes || "");
  const [recurringSchedule, setRecurringSchedule] = useState(group.recurringSchedule);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter group name");
      return;
    }

    onSave({
      ...group,
      name: name.trim(),
      level,
      notes: notes.trim() || undefined,
      recurringSchedule,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Edit Group</h3>
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Add any notes about this group..."
            />
          </div>

          {/* Recurring Schedule */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Weekly Lesson Schedule</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Day of Week</label>
                <select
                  value={recurringSchedule?.day ?? ""}
                  onChange={(e) => {
                    const day = e.target.value ? parseInt(e.target.value) : undefined;
                    if (day !== undefined) {
                      setRecurringSchedule({
                        day,
                        startTime: recurringSchedule?.startTime || "09:00",
                        endTime: recurringSchedule?.endTime || "10:00",
                        duration: recurringSchedule?.duration || 60,
                      });
                    } else {
                      setRecurringSchedule(undefined);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">No recurring schedule</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              {recurringSchedule && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={recurringSchedule.startTime}
                        onChange={(e) =>
                          setRecurringSchedule({
                            ...recurringSchedule,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={recurringSchedule.endTime}
                        onChange={(e) =>
                          setRecurringSchedule({
                            ...recurringSchedule,
                            endTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={recurringSchedule.duration}
                      onChange={(e) =>
                        setRecurringSchedule({
                          ...recurringSchedule,
                          duration: parseInt(e.target.value) || 60,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Student to Group Modal
function AddStudentToGroupModal({
  group,
  availableStudents,
  onClose,
  onSave,
}: {
  group: Group;
  availableStudents: Student[];
  onClose: () => void;
  onSave: (studentIds: string[]) => void;
}) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const handleToggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedStudents);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">Add Students to Group</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-600 text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {availableStudents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">
                  No available students. All students are already in groups or you haven't added any
                  students yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleToggleStudent(student.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedStudents.includes(student.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 size-5 rounded border-2 flex items-center justify-center ${
                          selectedStudents.includes(student.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedStudents.includes(student.id) && (
                          <span className="material-symbols-outlined text-white text-[14px]">
                            check
                          </span>
                        )}
                      </div>
                      <div
                        className={`size-8 rounded-full ${student.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
                      >
                        {student.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.level.toUpperCase()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedStudents.length === 0}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ""}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
