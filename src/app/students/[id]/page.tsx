"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { fetchStudentById, fetchGroupById, fetchGroups, updateStudent, deleteStudent, fetchStudentLessonHistory, fetchStudentHomework, deleteStudentHomework, deleteFile, fetchCurriculumTopics, sendPaymentReminder, fetchReminderSchedule, saveReminderSchedule, checkAndSendAutoReminder, StudentHomework, Student as DbStudent, Group as DbGroup, PaymentReminderSchedule } from "@/lib/supabase-helpers";
import { supabase } from "@/lib/supabase";

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
    day: number; // 0-6 (Sunday-Saturday)
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    duration: number; // minutes
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
    day: number; // 0-6 (Sunday-Saturday)
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    duration: number; // minutes
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
  lessonTitle?: string; // Optional for backward compatibility
  topic: string; // New field from schedule
  time?: string; // Time of the lesson (e.g., "09:00 - 11:00")
  duration: number;
  notes?: string;
}

interface CurriculumTopic {
  id: string;
  level: string;
  category: string;
  title: string;
}

function EditStudentModal({
  student,
  groups,
  onClose,
  onSave,
}: {
  student: Student;
  groups: Group[];
  onClose: () => void;
  onSave: (student: Student) => void;
}) {
  const [formData, setFormData] = useState(student);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If groupId changed, update the group's studentIds
    if (formData.groupId !== student.groupId) {
      const savedGroups = localStorage.getItem("student-groups");
      if (savedGroups) {
        let groupsList: Group[] = JSON.parse(savedGroups);

        // Remove from old group
        if (student.groupId) {
          groupsList = groupsList.map((g) =>
            g.id === student.groupId
              ? { ...g, studentIds: g.studentIds.filter((id) => id !== student.id) }
              : g
          );
        }

        // Add to new group
        if (formData.groupId) {
          groupsList = groupsList.map((g) =>
            g.id === formData.groupId && !g.studentIds.includes(student.id)
              ? { ...g, studentIds: [...g.studentIds, student.id] }
              : g
          );
        }

        localStorage.setItem("student-groups", JSON.stringify(groupsList));
      }
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">Edit Student</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Level *
              </label>
              <select
                required
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="a1">A1</option>
                <option value="a2">A2</option>
                <option value="b1">B1</option>
                <option value="b2">B2</option>
                <option value="c1">C1</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "paused" })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            {/* Group Assignment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group
              </label>
              <select
                value={formData.groupId || ""}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Individual (No Group)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} - {group.level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Information */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h4>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Parent/Guardian Information */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Parent/Guardian Contact</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Parent/Guardian Name"
                  value={formData.parentName || ""}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Parent/Guardian Email"
                  value={formData.parentEmail || ""}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Parent/Guardian Phone"
                  value={formData.parentPhone || ""}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Recurring Schedule */}
            {!formData.groupId && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Weekly Lesson Schedule</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Day of Week
                    </label>
                    <select
                      value={formData.recurringSchedule?.day ?? ""}
                      onChange={(e) => {
                        const day = e.target.value ? parseInt(e.target.value) : undefined;
                        if (day !== undefined) {
                          setFormData({
                            ...formData,
                            recurringSchedule: {
                              day,
                              startTime: formData.recurringSchedule?.startTime || "09:00",
                              endTime: formData.recurringSchedule?.endTime || "10:00",
                              duration: formData.recurringSchedule?.duration || 60,
                            },
                          });
                        } else {
                          setFormData({ ...formData, recurringSchedule: undefined });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

                  {formData.recurringSchedule && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={formData.recurringSchedule.startTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                recurringSchedule: {
                                  ...formData.recurringSchedule!,
                                  startTime: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={formData.recurringSchedule.endTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                recurringSchedule: {
                                  ...formData.recurringSchedule!,
                                  endTime: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min="15"
                          step="15"
                          value={formData.recurringSchedule.duration}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recurringSchedule: {
                                ...formData.recurringSchedule!,
                                duration: parseInt(e.target.value) || 60,
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                rows={4}
                placeholder="Add notes about this student..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddHomeworkModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (homework: Homework) => void;
}) {
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Date.now().toString(),
      date,
      description,
      completed: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">Add Homework</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the homework assignment..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Homework
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTopicModal({
  curriculumTopics,
  coveredTopics,
  onClose,
  onSave,
}: {
  curriculumTopics: CurriculumTopic[];
  coveredTopics: string[];
  onClose: () => void;
  onSave: (topicIds: string[]) => void;
}) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const availableTopics = curriculumTopics.filter(
    (topic) => !coveredTopics.includes(topic.id)
  );

  const filteredTopics = availableTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedTopics);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">Add Curriculum Topics</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div>
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {filteredTopics.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                {searchQuery ? "No topics found" : "All curriculum topics have been covered"}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleToggle(topic.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedTopics.includes(topic.id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 size-5 rounded border-2 flex items-center justify-center ${
                          selectedTopics.includes(topic.id)
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedTopics.includes(topic.id) && (
                          <span className="material-symbols-outlined text-white text-[14px]">
                            check
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{topic.title}</p>
                        <p className="text-xs text-slate-500">
                          {topic.category} • {topic.level.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedTopics.length === 0}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add {selectedTopics.length > 0 ? `(${selectedTopics.length})` : ""}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCustomTopicModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (topic: string) => void;
}) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(topic);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">Add Custom Topic</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Topic Name *
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Business Polish, Medical Vocabulary"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Topic
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPaymentModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payment: Payment) => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState<"lesson" | "package" | "trial">("lesson");
  const [status, setStatus] = useState<"paid" | "pending" | "overdue">("paid");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Date.now().toString(),
      date,
      amount: parseFloat(amount),
      currency,
      type,
      status,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">Add Payment</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "lesson" | "package" | "trial")}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="lesson">Lesson</option>
                <option value="package">Package</option>
                <option value="trial">Trial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "paid" | "pending" | "overdue")}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopic[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "homework" | "topics" | "payments" | "history">("overview");
  const [assignedHomework, setAssignedHomework] = useState<StudentHomework[]>([]);
  const [expandedHw, setExpandedHw] = useState<Set<string>>(new Set());
  const toggleHw = (id: string) => setExpandedHw((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddHomeworkModal, setShowAddHomeworkModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showAddCustomTopicModal, setShowAddCustomTopicModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Payment sticky notes
  const [stickyNotes, setStickyNotes] = useState<{ id: string; text: string }[]>([]);

  const saveStickyNotes = async (notes: { id: string; text: string }[]) => {
    setStickyNotes(notes);
    await supabase.from("students").update({ payment_notes: JSON.stringify(notes) }).eq("id", studentId);
  };

  const addStickyNote = () => {
    const newNotes = [...stickyNotes, { id: crypto.randomUUID(), text: "" }];
    saveStickyNotes(newNotes);
  };

  const updateStickyNote = (id: string, text: string) => {
    setStickyNotes((prev) => prev.map((n) => n.id === id ? { ...n, text } : n));
  };

  const saveStickyNoteBlur = (id: string, text: string) => {
    const updated = stickyNotes.map((n) => n.id === id ? { ...n, text } : n);
    saveStickyNotes(updated);
  };

  const deleteStickyNote = (id: string) => {
    const updated = stickyNotes.filter((n) => n.id !== id);
    saveStickyNotes(updated);
  };

  // Payment reminder state
  const [reminderLang, setReminderLang] = useState("uk");
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderSchedule, setReminderSchedule] = useState<PaymentReminderSchedule | null>(null);
  const [scheduleDay, setScheduleDay] = useState(1);
  const [scheduleActive, setScheduleActive] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    // Fetch student from Supabase
    const studentData = await fetchStudentById(studentId);

    if (studentData) {
      // Map database fields to frontend fields
      const mappedStudent: Student = {
        id: studentData.id,
        name: studentData.name,
        initials: studentData.initials,
        color: studentData.color,
        level: studentData.level,
        status: studentData.status,
        groupId: studentData.group_id,
        email: studentData.email,
        phone: studentData.phone,
        parentName: studentData.parent_name,
        parentEmail: studentData.parent_email,
        parentPhone: studentData.parent_phone,
        notes: studentData.notes,
        recurringSchedule: studentData.recurring_schedule,
        homework: studentData.homework || [],
        topicsCovered: studentData.topics_covered || [],
        customTopics: studentData.custom_topics || [],
        payments: studentData.payments || [],
        paymentNotes: (studentData as any).payment_notes ?? "",
        lessonHistory: [],
      };

      // Load lesson history from Supabase
      const lessonHistoryData = await fetchStudentLessonHistory(studentId);
      mappedStudent.lessonHistory = lessonHistoryData.map((h: any) => ({
        id: h.id,
        lessonId: h.lesson_id,
        date: h.date,
        topic: h.topic,
        time: h.time,
        duration: h.duration,
        notes: h.notes,
      }));

      setStudent(mappedStudent);
      try {
        const raw = (studentData as any).payment_notes;
        setStickyNotes(raw ? JSON.parse(raw) : []);
      } catch { setStickyNotes([]); }
      const studentLang = (studentData as any).language || "uk";
      setReminderLang(studentLang);

      // Load teacher-assigned homework from student_homework table
      const hwData = await fetchStudentHomework(studentId);
      setAssignedHomework(hwData);

      // Load group if student belongs to one
      if (studentData.group_id) {
        const groupData = await fetchGroupById(studentData.group_id);
        if (groupData) {
          setGroup({
            id: groupData.id,
            name: groupData.name,
            level: groupData.level,
            color: groupData.color,
            recurringSchedule: groupData.recurring_schedule,
            notes: groupData.notes,
            studentIds: [],
          });
        }
      }
    }

    // Load all groups
    const groupsData = await fetchGroups();
    setGroups(groupsData.map((g: DbGroup) => ({
      id: g.id,
      name: g.name,
      level: g.level,
      color: g.color,
      recurringSchedule: g.recurring_schedule,
      notes: g.notes,
      studentIds: [],
    })));

    // Load curriculum topics from Supabase
    const topics = await fetchCurriculumTopics();
    setCurriculumTopics(topics);
  };

  const saveStudent = async (updated: Student) => {
    try {
      // Map frontend fields to database fields
      await updateStudent(updated.id, {
        name: updated.name,
        initials: updated.initials,
        color: updated.color,
        level: updated.level,
        status: updated.status,
        group_id: updated.groupId,
        email: updated.email,
        phone: updated.phone,
        parent_name: updated.parentName,
        parent_email: updated.parentEmail,
        parent_phone: updated.parentPhone,
        notes: updated.notes,
        recurring_schedule: updated.recurringSchedule,
        homework: updated.homework || [],
        topics_covered: updated.topicsCovered || [],
        custom_topics: updated.customTopics || [],
        payments: updated.payments || [],
      });

      setStudent(updated);
    } catch (error) {
      console.error('Failed to update student:', error);
      alert('Failed to update student. Please try again.');
    }
  };

  const loadReminderSchedule = async () => {
    const sched = await fetchReminderSchedule(studentId);
    if (sched) {
      setReminderSchedule(sched);
      setScheduleDay(sched.day_of_month);
      setScheduleActive(sched.active);
    }
    // Also check if auto-reminder should fire today
    await checkAndSendAutoReminder(studentId);
  };

  const handleSendReminder = async () => {
    if (!studentId || reminderSending) return;
    setReminderSending(true);
    const ok = await sendPaymentReminder(studentId, reminderLang);
    setReminderSending(false);
    if (ok) {
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
    }
  };

  const handleToggleSchedule = async () => {
    const newActive = !scheduleActive;
    setScheduleActive(newActive);
    setScheduleSaving(true);
    const ok = await saveReminderSchedule(studentId, scheduleDay, reminderLang, newActive);
    setScheduleSaving(false);
    if (ok && !newActive) setReminderSchedule(null);
  };

  const handleScheduleDayChange = async (day: number) => {
    setScheduleDay(day);
    if (!scheduleActive) return;
    await saveReminderSchedule(studentId, day, reminderLang, true);
  };

  const handleDelete = async () => {
    try {
      const studentData = await fetchStudentById(studentId);

      // 1. Delete all R2 files belonging to this student's homework
      const homeworkList = await fetchStudentHomework(studentId);
      for (const hw of homeworkList) {
        const allFiles = [...(hw.teacher_files || []), ...(hw.student_files || [])];
        for (const file of allFiles) {
          if (file.storagePath) {
            try { await deleteFile(file.storagePath); } catch { /* ignore individual failures */ }
          }
        }
        try { await deleteStudentHomework(hw.id); } catch { /* ignore */ }
      }

      // 2. Delete auth account — by userId if linked, otherwise look up by email
      const email = studentData?.name
        ? studentData.name.trim().toLowerCase().replace(/\s+/g, '.') + '@polspeak.com'
        : null;

      const { data: { session: teacherSession } } = await supabase.auth.getSession();
      await fetch('/api/student-auth/create', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(teacherSession?.access_token ? { Authorization: `Bearer ${teacherSession.access_token}` } : {}),
        },
        body: JSON.stringify({ userId: studentData?.user_id || null, email }),
      });

      // 3. Delete student record
      await deleteStudent(studentId);
      router.push("/students");
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  // Load reminder schedule when payments tab activates
  useEffect(() => {
    if (activeTab === "payments" && studentId) loadReminderSchedule();
  }, [activeTab, studentId]);

  if (!student) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Student not found</p>
        </main>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      a1: "bg-emerald-50 text-emerald-700 border-emerald-200",
      a2: "bg-blue-50 text-blue-700 border-blue-200",
      b1: "bg-indigo-50 text-indigo-700 border-indigo-200",
      b2: "bg-purple-50 text-purple-700 border-purple-200",
      c1: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return colors[level.toLowerCase()] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const totalPaid = student.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = student.payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);

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
                className={`size-12 rounded-full ${student.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
              >
                {student.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-[#1e293b] truncate">
                  {student.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(
                      student.level
                    )}`}
                  >
                    {student.level.toUpperCase()}
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
                  {group && (
                    <a
                      href={`/students/groups/${group.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">groups</span>
                      {group.name}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
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

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  activeTab === "overview"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("homework")}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  activeTab === "homework"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Homework ({(student.homework?.length || 0) + assignedHomework.length})
              </button>
              <button
                onClick={() => setActiveTab("topics")}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  activeTab === "topics"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Topics ({(student.topicsCovered?.length || 0) + (student.customTopics?.length || 0)})
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  activeTab === "payments"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Payments ({student.payments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  activeTab === "history"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Lesson History ({student.lessonHistory?.length || 0})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Group Information */}
                {group && (
                  <div className="lg:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-600">groups</span>
                          Group Class
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                          This student is part of <strong>{group.name}</strong>
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Level:</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(group.level)}`}>
                              {group.level.toUpperCase()}
                            </span>
                          </div>
                          {group.recurringSchedule && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Schedule:</span>
                              <span className="text-xs font-medium text-slate-700">
                                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][group.recurringSchedule.day]} at {group.recurringSchedule.startTime} - {group.recurringSchedule.endTime}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Students:</span>
                            <span className="text-xs font-medium text-slate-700">
                              {group.studentIds.length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={`/students/groups/${group.id}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        View Group
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Recurring Schedule for Individual Students */}
                {!group && student.recurringSchedule && (
                  <div className="lg:col-span-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-full bg-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">event_repeat</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Weekly Lesson Schedule</h3>
                        <p className="text-sm text-slate-600">
                          Every <strong>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][student.recurringSchedule.day]}</strong> from <strong>{student.recurringSchedule.startTime}</strong> to <strong>{student.recurringSchedule.endTime}</strong> ({student.recurringSchedule.duration} minutes)
                        </p>
                      </div>
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Email</p>
                      <p className="text-sm text-slate-900">{student.email || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Phone</p>
                      <p className="text-sm text-slate-900">{student.phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Parent/Guardian Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Name</p>
                        <p className="text-sm text-slate-900">{student.parentName || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Email</p>
                        <p className="text-sm text-slate-900">{student.parentEmail || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Phone</p>
                        <p className="text-sm text-slate-900">{student.parentPhone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Notes</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {student.notes || "No notes yet"}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Total Lessons</span>
                        <span className="text-sm font-bold text-slate-900">
                          {student.lessonHistory?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Pending Homework</span>
                        <span className="text-sm font-bold text-amber-600">
                          {(student.homework?.filter((h) => !h.completed).length || 0) + assignedHomework.filter((h) => h.status === 'pending').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Topics Covered</span>
                        <span className="text-sm font-bold text-indigo-600">
                          {(student.topicsCovered?.length || 0) + (student.customTopics?.length || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <span className="text-sm text-slate-600">Total Paid</span>
                        <span className="text-sm font-bold text-emerald-600">
                          ${totalPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Pending</span>
                        <span className="text-sm font-bold text-red-600">
                          ${totalPending.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Homework Tab */}
            {activeTab === "homework" && (
              <div className="space-y-4">
                {/* Teacher-assigned homework from homework page */}
                {assignedHomework.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Assigned by Teacher</h3>
                    <div className="space-y-2">
                      {assignedHomework.map((hw) => {
                        const statusColor =
                          hw.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                          hw.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700';
                        const statusLabel =
                          hw.status === 'graded' ? 'Graded' :
                          hw.status === 'submitted' ? 'Submitted' :
                          'Pending';
                        const isExpanded = expandedHw.has(hw.id);
                        return (
                          <div key={hw.id} className="rounded-lg border border-slate-200 overflow-hidden">
                            {/* Header — always visible */}
                            <button
                              onClick={() => toggleHw(hw.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                            >
                              <div className={`size-2 rounded-full shrink-0 ${
                                hw.status === 'graded' ? 'bg-emerald-500' :
                                hw.status === 'submitted' ? 'bg-blue-500' :
                                'bg-amber-400'
                              }`} />
                              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-800">{hw.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                                {hw.grade && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">{hw.grade}</span>}
                              </div>
                              {hw.due_date && !isExpanded && (
                                <span className="text-xs text-slate-400 shrink-0">Due {new Date(hw.due_date).toLocaleDateString()}</span>
                              )}
                              <span className={`material-symbols-outlined text-slate-400 text-lg shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                              </span>
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2">
                                {hw.description && <p className="text-xs text-slate-500">{hw.description}</p>}
                                <div className="flex items-center gap-4 flex-wrap">
                                  {hw.due_date && <span className="text-xs text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>}
                                  {hw.submitted_at && <span className="text-xs text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">task_alt</span>Submitted: {new Date(hw.submitted_at).toLocaleDateString()}</span>}
                                </div>
                                {hw.teacher_files && hw.teacher_files.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Attached files</p>
                                    {hw.teacher_files.map((f, i) => (
                                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs group"
                                      >
                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 text-base">description</span>
                                        <span className="text-slate-600 flex-1 truncate font-medium">{f.name}</span>
                                        <span className="material-symbols-outlined text-slate-400 text-sm">download</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {hw.student_files && hw.student_files.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Student submission</p>
                                    {hw.student_files.map((f, i) => (
                                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 text-xs group hover:bg-blue-100 transition-all"
                                      >
                                        <span className="material-symbols-outlined text-blue-500 text-base">upload_file</span>
                                        <span className="text-blue-700 flex-1 truncate font-medium">{f.name}</span>
                                        <span className="material-symbols-outlined text-blue-400 text-sm">download</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {hw.student_note && (
                                  <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 italic">
                                    <span className="font-semibold not-italic text-slate-500">Note: </span>{hw.student_note}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Simple homework notes */}
                {(student.homework?.length > 0 || assignedHomework.length === 0) && (
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Homework Notes</h3>
                  <button
                    onClick={() => setShowAddHomeworkModal(true)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add Note
                  </button>
                </div>
                {student.homework?.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No notes yet</p>
                ) : (
                  <div className="space-y-2">
                    {student.homework?.map((hw) => (
                      <div
                        key={hw.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <button
                          onClick={() => {
                            const updated = {
                              ...student,
                              homework: student.homework.map((h) =>
                                h.id === hw.id ? { ...h, completed: !h.completed } : h
                              ),
                            };
                            saveStudent(updated);
                          }}
                          className={`flex-shrink-0 size-6 rounded border-2 flex items-center justify-center cursor-pointer ${
                            hw.completed
                              ? "bg-emerald-600 border-emerald-600"
                              : "border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {hw.completed && (
                            <span className="material-symbols-outlined text-white text-[16px]">check</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              hw.completed ? "text-slate-500 line-through" : "text-slate-700"
                            }`}
                          >
                            {hw.description}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(hw.date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const updated = {
                              ...student,
                              homework: student.homework.filter((h) => h.id !== hw.id),
                            };
                            saveStudent(updated);
                          }}
                          className="flex-shrink-0 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                )}
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === "topics" && (
              <div className="space-y-4">
                {/* Curriculum Topics */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Curriculum Topics</h3>
                    <button
                      onClick={() => setShowAddTopicModal(true)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Topic
                    </button>
                  </div>
                  {student.topicsCovered?.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No topics covered yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {student.topicsCovered?.map((topicId) => {
                        const topic = curriculumTopics.find((t) => t.id === topicId);
                        return topic ? (
                          <div
                            key={topicId}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm"
                          >
                            <span>{topic.title}</span>
                            <button
                              onClick={() => {
                                const updated = {
                                  ...student,
                                  topicsCovered: student.topicsCovered.filter((id) => id !== topicId),
                                };
                                saveStudent(updated);
                              }}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Topics */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Custom Topics</h3>
                    <button
                      onClick={() => setShowAddCustomTopicModal(true)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Custom
                    </button>
                  </div>
                  {student.customTopics?.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No custom topics yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {student.customTopics?.map((topic, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm"
                        >
                          <span>{topic}</span>
                          <button
                            onClick={() => {
                              const updated = {
                                ...student,
                                customTopics: student.customTopics.filter((_, i) => i !== index),
                              };
                              saveStudent(updated);
                            }}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <div className="space-y-4">

                {/* Payment Reminder Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-indigo-500 text-[20px]">notifications</span>
                    <h3 className="text-base font-bold text-slate-900">Payment Reminder</h3>
                  </div>

                  {/* Manual send */}
                  <div className="flex items-center gap-3 flex-wrap mb-5">
                    <p className="text-sm text-slate-600 flex-1 min-w-[160px]">
                      Send a polite payment reminder to {student.name} in their preferred language.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleSendReminder}
                        disabled={reminderSending}
                        className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {reminderSending ? (
                          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <span className="material-symbols-outlined text-[17px]">send</span>
                        )}
                        Send Reminder
                      </button>
                    </div>
                  </div>
                  {reminderSent && (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm mb-4">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Reminder sent successfully!
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-amber-500 text-[18px]">schedule</span>
                      <h4 className="text-sm font-semibold text-slate-800">Automate Monthly Reminder</h4>
                      <button
                        onClick={handleToggleSchedule}
                        disabled={scheduleSaving}
                        className={`ml-auto relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-60 ${
                          scheduleActive ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${scheduleActive ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>

                    {scheduleActive && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Day of month</label>
                        <select
                          value={scheduleDay}
                          onChange={(e) => handleScheduleDayChange(Number(e.target.value))}
                          className="w-48 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1.5">
                          Reminder sends automatically on day {scheduleDay} of every month.
                        </p>
                        {reminderSchedule?.last_sent_month && (
                          <p className="text-xs text-slate-400 mt-0.5">Last auto-sent: {reminderSchedule.last_sent_month}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky Notes */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-[18px]">sticky_note_2</span>
                      <h3 className="text-sm font-semibold text-slate-800">Payment Notes</h3>
                    </div>
                    <button
                      onClick={addStickyNote}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      Add Note
                    </button>
                  </div>

                  {stickyNotes.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-amber-200 block mb-2">sticky_note_2</span>
                      <p className="text-sm text-slate-400">No notes yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {stickyNotes.map((note) => (
                        <div
                          key={note.id}
                          className="relative group flex flex-col bg-amber-50 border border-amber-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          style={{ minHeight: 120 }}
                        >
                          {/* Delete button */}
                          <button
                            onClick={() => deleteStickyNote(note.id)}
                            className="absolute top-2 right-2 size-5 rounded-full hover:bg-red-100 text-amber-400 hover:text-red-500 transition-colors flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>

                          {/* Tape strip at top */}
                          <div className="h-2 w-10 bg-amber-300/60 rounded-sm mx-auto -mt-1 mb-1" />

                          {/* Textarea */}
                          <textarea
                            value={note.text}
                            onChange={(e) => updateStickyNote(note.id, e.target.value)}
                            onBlur={(e) => saveStickyNoteBlur(note.id, e.target.value)}
                            placeholder=""
                            className="flex-1 w-full px-3 py-2 bg-transparent text-sm text-amber-950 placeholder:text-amber-300 focus:outline-none resize-none leading-relaxed"
style={{ minHeight: 100 }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment History Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
                    <button
                      onClick={() => setShowAddPaymentModal(true)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Payment
                    </button>
                  </div>
                  {student.payments?.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-12">No payments recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {student.payments
                        ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-900">
                                  ${payment.amount.toFixed(2)} {payment.currency}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    payment.status === "paid"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : payment.status === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {payment.status}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                                  {payment.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{new Date(payment.date).toLocaleDateString()}</p>
                              {payment.notes && <p className="text-xs text-slate-600 mt-1">{payment.notes}</p>}
                            </div>
                            <button
                              onClick={() => {
                                const updated = {
                                  ...student,
                                  payments: student.payments.filter((p) => p.id !== payment.id),
                                };
                                saveStudent(updated);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lesson History Tab */}
            {activeTab === "history" && (
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Lesson History</h3>
                {student.lessonHistory?.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">No lessons recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {student.lessonHistory
                      ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((lesson) => (
                        <div key={lesson.id} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-semibold text-slate-900">{lesson.topic}</h4>
                            <span className="text-xs text-slate-500">{lesson.duration} min</span>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
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
            )}
          </div>
        </div>
      </main>

      {/* Edit Student Modal */}
      {showEditModal && (
        <EditStudentModal
          student={student}
          groups={groups}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            saveStudent(updated);
            setShowEditModal(false);

            // Reload group if groupId changed
            if (updated.groupId !== student.groupId) {
              const savedGroups = localStorage.getItem("student-groups");
              if (updated.groupId && savedGroups) {
                const groupsList: Group[] = JSON.parse(savedGroups);
                const newGroup = groupsList.find((g) => g.id === updated.groupId);
                setGroup(newGroup || null);
              } else {
                setGroup(null);
              }
            }
          }}
        />
      )}

      {/* Add Homework Modal */}
      {showAddHomeworkModal && (
        <AddHomeworkModal
          onClose={() => setShowAddHomeworkModal(false)}
          onSave={(homework) => {
            const updated = {
              ...student,
              homework: [...(student.homework || []), homework],
            };
            saveStudent(updated);
            setShowAddHomeworkModal(false);
          }}
        />
      )}

      {/* Add Topic Modal */}
      {showAddTopicModal && (
        <AddTopicModal
          curriculumTopics={curriculumTopics}
          coveredTopics={student.topicsCovered || []}
          onClose={() => setShowAddTopicModal(false)}
          onSave={(topicIds) => {
            const updated = {
              ...student,
              topicsCovered: [...(student.topicsCovered || []), ...topicIds],
            };
            saveStudent(updated);
            setShowAddTopicModal(false);
          }}
        />
      )}

      {/* Add Custom Topic Modal */}
      {showAddCustomTopicModal && (
        <AddCustomTopicModal
          onClose={() => setShowAddCustomTopicModal(false)}
          onSave={(topic) => {
            const updated = {
              ...student,
              customTopics: [...(student.customTopics || []), topic],
            };
            saveStudent(updated);
            setShowAddCustomTopicModal(false);
          }}
        />
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <AddPaymentModal
          onClose={() => setShowAddPaymentModal(false)}
          onSave={(payment) => {
            const updated = {
              ...student,
              payments: [...(student.payments || []), payment],
            };
            saveStudent(updated);
            setShowAddPaymentModal(false);
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center size-12 rounded-full bg-red-100 mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Student</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Are you sure you want to delete {student.name}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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
