"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchStudents, fetchGroups, fetchLessons, createLesson, updateLesson, deleteLesson, createLessonHistory, deleteLessonHistoryByLessonId, Student as DbStudent, Group as DbGroup, Lesson as DbLesson } from "@/lib/supabase-helpers";

interface Student {
  id: string;
  name: string;
  initials: string;
  color: string;
  level: string;
  groupId?: string;
  recurringSchedule?: {
    day: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  lessonHistory?: {
    id: string;
    lessonId?: string; // To track which lesson this is from
    date: string;
    topic: string;
    time?: string; // Time of the lesson (e.g., "09:00 - 11:00")
    duration: number;
    notes?: string;
  }[];
}

interface Group {
  id: string;
  name: string;
  color: string;
  description?: string;
  students?: string[]; // Legacy field
  studentIds?: string[]; // New field - actual field name in localStorage
  recurringSchedule?: {
    day: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  lessonHistory?: {
    id: string;
    lessonId?: string;
    date: string;
    topic: string;
    time?: string;
    duration: number;
    notes?: string;
  }[];
}

interface Lesson {
  id: string;
  studentId?: string;
  groupId?: string;
  studentName?: string;
  groupName?: string;
  studentColor?: string;
  groupColor?: string;
  title: string;
  day: number; // 0 = Monday, 6 = Sunday
  date: string; // ISO date string (e.g., "2025-01-07")
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  duration: number; // minutes
  type: "regular" | "trial" | "makeup";
  completed?: boolean;
  notes?: string;
  isRecurring?: boolean; // Generated from recurring schedule
}

const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Helper function to format date in local timezone (avoids UTC timezone issues)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    time: string;
  } | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [studentsData, groupsData] = await Promise.all([
      fetchStudents(),
      fetchGroups()
    ]);

    // Map database fields to frontend fields
    setStudents(studentsData.map((s: DbStudent) => ({
      id: s.id,
      name: s.name,
      initials: s.initials,
      color: s.color,
      level: s.level,
      groupId: s.group_id,
      recurringSchedule: s.recurring_schedule,
      lessonHistory: [],
    })));

    setGroups(groupsData.map((g: DbGroup) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      description: g.description,
      studentIds: [],
      recurringSchedule: g.recurring_schedule,
      lessonHistory: [],
    })));
  };

  // Helper function to get week dates
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentWeekStart);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start from Monday

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate recurring lessons from student and group schedules
  const generateRecurringLessons = (): Lesson[] => {
    const recurringLessons: Lesson[] = [];
    const weekDates = getWeekDates();

    // Generate lessons from individual students (not in groups)
    students.forEach((student) => {
      if (!student.groupId && student.recurringSchedule) {
        const schedule = student.recurringSchedule;
        const lessonDate = weekDates[schedule.day];

        recurringLessons.push({
          id: `recurring-student-${student.id}-${schedule.day}`,
          studentId: student.id,
          studentName: student.name,
          studentColor: student.color,
          title: "Regular Lesson",
          day: schedule.day,
          date: formatLocalDate(lessonDate),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          duration: schedule.duration,
          type: "regular",
          isRecurring: true,
        });
      }
    });

    // Generate lessons from groups
    groups.forEach((group) => {
      if (group.recurringSchedule) {
        const schedule = group.recurringSchedule;
        const lessonDate = weekDates[schedule.day];

        recurringLessons.push({
          id: `recurring-group-${group.id}-${schedule.day}`,
          groupId: group.id,
          groupName: group.name,
          groupColor: group.color,
          title: "Group Lesson",
          day: schedule.day,
          date: formatLocalDate(lessonDate),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          duration: schedule.duration,
          type: "regular",
          isRecurring: true,
        });
      }
    });

    return recurringLessons;
  };

  // Load lessons from Supabase and merge with recurring lessons
  useEffect(() => {
    loadLessons();
  }, [students, groups, currentWeekStart]);

  const loadLessons = async () => {
    const lessonsData = await fetchLessons();

    // Map database fields to frontend fields
    let manualLessons: Lesson[] = lessonsData.map((l: DbLesson) => ({
      id: l.id,
      studentId: l.student_id,
      groupId: l.group_id,
      studentName: l.student_name,
      groupName: l.group_name,
      studentColor: students.find(s => s.id === l.student_id)?.color,
      groupColor: l.group_color,
      title: l.title,
      day: l.day,
      date: l.date,
      startTime: l.start_time,
      endTime: l.end_time,
      duration: l.duration,
      type: l.type,
      completed: l.completed,
      notes: l.notes,
      isRecurring: l.is_recurring,
    }));

    // Merge manual lessons with recurring lessons
    const recurringLessons = generateRecurringLessons();
    const allLessons = [...manualLessons, ...recurringLessons];
    setLessons(allLessons);
  };

  const handleSlotClick = (day: number, time: string) => {
    setSelectedSlot({ day, time });
    setShowAddModal(true);
  };

  const handleAddLesson = async (lesson: Omit<Lesson, "id" | "date">) => {
    try {
      // Calculate the actual date for this lesson based on current week
      const weekDates = getWeekDates();
      const lessonDate = weekDates[lesson.day];
      const dateStr = formatLocalDate(lessonDate);

      // Map frontend fields to database fields
      await createLesson({
        student_id: lesson.studentId,
        group_id: lesson.groupId,
        student_name: lesson.studentName,
        group_name: lesson.groupName,
        group_color: lesson.groupColor,
        title: lesson.title,
        day: lesson.day,
        date: dateStr,
        start_time: lesson.startTime,
        end_time: lesson.endTime,
        duration: lesson.duration,
        type: lesson.type,
        completed: lesson.completed || false,
        is_recurring: lesson.isRecurring || false,
        notes: lesson.notes,
      });

      await loadLessons(); // Reload lessons
      setShowAddModal(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to create lesson:', error);
      alert('Failed to create lesson. Please try again.');
    }
  };

  const handleDeleteLesson = (lessonId: string) => {
    setLessonToDelete(lessonId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (lessonToDelete) {
      try {
        await deleteLesson(lessonToDelete);
        await loadLessons();
        setShowDeleteModal(false);
        setLessonToDelete(null);
      } catch (error) {
        console.error('Failed to delete lesson:', error);
        alert('Failed to delete lesson. Please try again.');
      }
    }
  };

  const handleToggleComplete = async (lessonId: string) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const newCompletedState = !lesson.completed;

    try {
      // Update lesson completion state in Supabase
      await updateLesson(lessonId, {
        completed: newCompletedState
      });

      // Update local state immediately for better UX
      setLessons(prevLessons =>
        prevLessons.map(l =>
          l.id === lessonId ? { ...l, completed: newCompletedState } : l
        )
      );

      // Add or remove from lesson history based on new state
      if (newCompletedState) {
        await addToLessonHistory(lesson);
      } else {
        await removeFromLessonHistory(lesson);
      }
    } catch (error) {
      console.error('Failed to update lesson:', error);
      alert('Failed to update lesson. Please try again.');
    }
  };

  const addToLessonHistory = async (lesson: Lesson) => {
    try {
      // Create lesson history entry in Supabase
      // This works for both individual and group lessons
      // student_id or group_id will be set based on lesson type
      await createLessonHistory({
        student_id: lesson.studentId || undefined,
        group_id: lesson.groupId || undefined,
        lesson_id: lesson.id,
        date: lesson.date,
        topic: lesson.title,
        time: `${lesson.startTime} - ${lesson.endTime}`,
        duration: lesson.duration,
        notes: lesson.notes,
      });
    } catch (error) {
      console.error('Failed to add lesson to history:', error);
    }
  };

  const removeFromLessonHistory = async (lesson: Lesson) => {
    try {
      // Delete from lesson_history table in Supabase
      await deleteLessonHistoryByLessonId(lesson.id);
    } catch (error) {
      console.error('Failed to remove lesson from history:', error);
    }
  };

  const getLessonsForSlot = (day: number, time: string, date: Date) => {
    const dateStr = formatLocalDate(date);

    return lessons.filter((lesson) => {
      const lessonHour = parseInt(lesson.startTime.split(":")[0]);
      const slotHour = parseInt(time.split(":")[0]);
      const lessonDay = lesson.day;

      // Check if day and hour match, AND if the lesson date matches the slot date
      return lessonDay === day && lessonHour === slotHour && lesson.date === dateStr;
    });
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    setCurrentWeekStart(new Date());
  };

  const weekDates = getWeekDates();
  const today = new Date();
  const todayDay = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sunday from 0 to 6

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
                  Schedule
                </h2>
                <p className="text-[#64748b] text-xs md:text-sm mt-1 hidden sm:block">
                  Manage your lessons and student appointments
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_left
                    </span>
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-2 py-1 text-xs font-medium hover:bg-slate-100 rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedSlot(null);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#00132c] hover:bg-[#0f2545] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  <span>Add Lesson</span>
                </button>
              </div>
            </div>

            {/* Week Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4 md:mt-6">
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">
                  This Week
                </p>
                <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">
                  {lessons.length}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">
                  Total Hours
                </p>
                <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">
                  {(lessons.reduce((total, lesson) => total + (lesson.duration / 60), 0)).toFixed(1)}h
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">
                  Students
                </p>
                <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">
                  {new Set([...lessons.filter(l => l.studentId).map((l) => l.studentId), ...lessons.filter(l => l.groupId).map(l => l.groupId)]).size}
                </p>
              </div>
              <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">
                  Completion
                </p>
                <p className="text-lg md:text-xl font-bold text-emerald-600 mt-0.5">
                  {lessons.length === 0
                    ? "0%"
                    : `${Math.round((lessons.filter(l => l.completed).length / lessons.length) * 100)}%`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                  <div className="p-3 md:p-4 text-xs md:text-sm font-semibold text-slate-600">
                    Time
                  </div>
                  {daysOfWeek.map((day, index) => {
                    const date = weekDates[index];
                    const isToday =
                      index === todayDay &&
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth();

                    return (
                      <div
                        key={day}
                        className={`p-2 md:p-4 text-center border-l border-slate-200 ${
                          isToday ? "bg-indigo-50" : ""
                        }`}
                      >
                        <p
                          className={`text-[10px] md:text-xs font-medium ${
                            isToday ? "text-indigo-600" : "text-slate-600"
                          }`}
                        >
                          {day.substring(0, 3)}
                        </p>
                        <p
                          className={`text-base md:text-lg font-bold mt-0.5 ${
                            isToday ? "text-indigo-600" : "text-slate-900"
                          }`}
                        >
                          {date.getDate()}
                        </p>
                        {isToday && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-600 text-white text-[9px] md:text-[10px] font-medium rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="divide-y divide-slate-200">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="grid grid-cols-8 min-h-[100px] md:min-h-[120px]"
                    >
                      {/* Time Label */}
                      <div className="p-2 md:p-3 text-xs md:text-sm font-medium text-slate-600 flex items-start">
                        {time}
                      </div>

                      {/* Day Slots */}
                      {daysOfWeek.map((_, dayIndex) => {
                        const slotDate = weekDates[dayIndex];
                        const slotLessons = getLessonsForSlot(dayIndex, time, slotDate);
                        const isToday = dayIndex === todayDay;

                        return (
                          <div
                            key={dayIndex}
                            onClick={() =>
                              slotLessons.length === 0 &&
                              handleSlotClick(dayIndex, time)
                            }
                            className={`border-l border-slate-200 p-1.5 md:p-2 cursor-pointer transition-colors relative ${
                              slotLessons.length === 0
                                ? `hover:bg-slate-50 ${
                                    isToday ? "bg-indigo-50/30" : ""
                                  }`
                                : ""
                            }`}
                          >
                            {slotLessons.map((lesson) => {
                              const lessonColor = lesson.groupId
                                ? lesson.groupColor
                                : lesson.studentColor;
                              const lessonName = lesson.groupId
                                ? lesson.groupName
                                : lesson.studentName;
                              const isGroup = !!lesson.groupId;
                              // Calculate height based on duration
                              // Each slot is 120px, so we calculate how many slots this lesson spans
                              // Example: 180 minutes (3 hours) = 3 * 120px = 360px
                              const slotHeight = 120; // Height of one time slot
                              const durationInHours = lesson.duration / 60;
                              const heightInPixels =
                                durationInHours * slotHeight;

                              return (
                                <div
                                  key={`${lesson.id}-${lesson.date}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="group absolute inset-0 z-10"
                                  style={{
                                    height: `${heightInPixels}px`,
                                    width: `${
                                      100 / Math.max(1, slotLessons.length)
                                    }%`,
                                    left: `${
                                      (slotLessons.indexOf(lesson) * 100) /
                                      Math.max(1, slotLessons.length)
                                    }%`,
                                  }}
                                >
                                  <div
                                    className={`${lessonColor} ${
                                      lesson.completed
                                        ? "opacity-60"
                                        : "bg-opacity-90"
                                    } text-white rounded-lg p-1.5 shadow-sm hover:shadow-md transition-all h-full cursor-pointer relative m-0.5 flex flex-col`}
                                  >
                                    {/* Buttons at top for tablet/mobile, hidden on desktop until hover */}
                                    <div className="flex items-center justify-end gap-0.5 mb-1 lg:hidden">
                                      <button
                                        onClick={() =>
                                          handleToggleComplete(lesson.id)
                                        }
                                        className="p-0.5 hover:bg-white/20 rounded"
                                        title={
                                          lesson.completed
                                            ? "Mark as incomplete"
                                            : "Mark as complete"
                                        }
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          {lesson.completed
                                            ? "check_circle"
                                            : "radio_button_unchecked"}
                                        </span>
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteLesson(lesson.id)
                                        }
                                        className="p-0.5 hover:bg-white/20 rounded"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          close
                                        </span>
                                      </button>
                                    </div>

                                    {/* Content - different layout for tablet vs desktop */}
                                    <div className="flex-1 flex flex-col lg:justify-start justify-end">
                                      {/* Tablet/Mobile: Bottom left corner, only name and time */}
                                      <div className="lg:hidden">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          {isGroup && (
                                            <span className="material-symbols-outlined text-[10px]">
                                              groups
                                            </span>
                                          )}
                                          {lesson.isRecurring && (
                                            <span className="material-symbols-outlined text-[10px]">
                                              event_repeat
                                            </span>
                                          )}
                                          <p className="text-[11px] font-bold truncate">
                                            {lessonName}
                                          </p>
                                        </div>
                                        <p className="text-[9px] opacity-75">
                                          {lesson.startTime} - {lesson.endTime}
                                        </p>
                                      </div>

                                      {/* Desktop: Full info with buttons on the side */}
                                      <div className="hidden lg:flex items-start justify-between gap-1">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1 mb-0.5">
                                            {isGroup && (
                                              <span className="material-symbols-outlined text-[10px]">
                                                groups
                                              </span>
                                            )}
                                            {lesson.isRecurring && (
                                              <span className="material-symbols-outlined text-[10px]">
                                                event_repeat
                                              </span>
                                            )}
                                            <p className="text-[11px] font-bold truncate">
                                              {lessonName}
                                            </p>
                                          </div>
                                          <p className="text-[10px] opacity-90 truncate">
                                            {lesson.title}
                                          </p>
                                          <p className="text-[9px] opacity-75 mt-0.5">
                                            {lesson.startTime} -{" "}
                                            {lesson.endTime}
                                          </p>
                                        </div>

                                        {/* Desktop buttons - only visible on hover */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() =>
                                              handleToggleComplete(lesson.id)
                                            }
                                            className="p-0.5 hover:bg-white/20 rounded"
                                            title={
                                              lesson.completed
                                                ? "Mark as incomplete"
                                                : "Mark as complete"
                                            }
                                          >
                                            <span className="material-symbols-outlined text-[16px]">
                                              {lesson.completed
                                                ? "check_circle"
                                                : "radio_button_unchecked"}
                                            </span>
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteLesson(lesson.id)
                                            }
                                            className="p-0.5 hover:bg-white/20 rounded"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">
                                              close
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Lesson Modal */}
      {showAddModal && (
        <AddLessonModal
          selectedSlot={selectedSlot}
          students={students}
          groups={groups}
          onAdd={handleAddLesson}
          onClose={() => {
            setShowAddModal(false);
            setSelectedSlot(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center justify-center size-12 rounded-full bg-red-100 mx-auto mb-4">
                <span className="material-symbols-outlined text-red-600 text-2xl">
                  delete
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                Delete Lesson
              </h3>
              <p className="text-sm text-slate-600 text-center mb-6">
                Are you sure you want to delete this lesson? This action cannot
                be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setLessonToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Lesson Modal Component
function AddLessonModal({
  selectedSlot,
  students,
  groups,
  onAdd,
  onClose,
}: {
  selectedSlot: { day: number; time: string } | null;
  students: Student[];
  groups: Group[];
  onAdd: (lesson: Omit<Lesson, "id" | "date">) => void;
  onClose: () => void;
}) {
  const [lessonFor, setLessonFor] = useState<"student" | "group">("student");
  const [studentId, setStudentId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(selectedSlot?.day ?? 0);
  const [startTime, setStartTime] = useState(selectedSlot?.time ?? "09:00");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState<"regular" | "trial" | "makeup">("regular");

  // Calculate duration in minutes
  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !startTime || !endTime) {
      alert("Please fill in all fields");
      return;
    }

    if (lessonFor === "student") {
      if (!studentId) {
        alert("Please select a student");
        return;
      }
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      onAdd({
        studentId,
        studentName: student.name,
        studentColor: student.color,
        title,
        day,
        startTime,
        endTime,
        duration: calculateDuration(startTime, endTime),
        type,
      });
    } else {
      if (!groupId) {
        alert("Please select a group");
        return;
      }
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      onAdd({
        groupId,
        groupName: group.name,
        groupColor: group.color,
        title,
        day,
        startTime,
        endTime,
        duration: calculateDuration(startTime, endTime),
        type,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-bold text-slate-900">
            Add Lesson
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-600 text-[20px]">
              close
            </span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 md:p-6 space-y-3 md:space-y-4"
        >
          {/* Lesson For (Student or Group) */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Lesson For
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLessonFor("student")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lessonFor === "student"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setLessonFor("group")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lessonFor === "group"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Group
              </button>
            </div>
          </div>

          {/* Student/Group Selection */}
          {lessonFor === "student" ? (
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                style={{ fontSize: "14px" }}
                required
              >
                <option value="" style={{ fontSize: "14px", padding: "8px" }}>
                  Select a student...
                </option>
                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                    style={{ fontSize: "14px", padding: "8px" }}
                  >
                    {student.name} ({student.level})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
                Group
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                style={{ fontSize: "14px" }}
                required
              >
                <option value="" style={{ fontSize: "14px", padding: "8px" }}>
                  Select a group...
                </option>
                {groups.map((group) => (
                  <option
                    key={group.id}
                    value={group.id}
                    style={{ fontSize: "14px", padding: "8px" }}
                  >
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lesson Title */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Lesson Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Grammar: Present Tense"
              required
            />
          </div>

          {/* Day Selection */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Day
            </label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              style={{ fontSize: "14px" }}
            >
              {daysOfWeek.map((dayName, index) => (
                <option
                  key={index}
                  value={index}
                  style={{ fontSize: "14px", padding: "8px" }}
                >
                  {dayName}
                </option>
              ))}
            </select>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Lesson Type */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1.5 md:mb-2">
              Lesson Type
            </label>
            <div className="flex gap-1.5 md:gap-2">
              {(["regular", "trial", "makeup"] as const).map((lessonType) => (
                <button
                  key={lessonType}
                  type="button"
                  onClick={() => setType(lessonType)}
                  className={`flex-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors cursor-pointer ${
                    type === lessonType
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lessonType.charAt(0).toUpperCase() + lessonType.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 md:gap-3 pt-3 md:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              Add Lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
