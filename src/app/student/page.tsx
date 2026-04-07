"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  fetchStudentByUserId,
  fetchStudentHomework,
  fetchSharedLessonsForStudent,
  fetchLessonContentById,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  fetchStudentUnreadCount,
  fetchActivePaymentReminder,
  dismissPaymentReminder,
  fetchSetting,
  type Student,
  type StudentHomework,
  type SharedLesson,
  type LessonContent,
  type Message,
  type PaymentReminder,
} from "@/lib/supabase-helpers";

const studentTranslations = {
  uk: {
    portal: "Студентський портал",
    navHomework: "Завдання", navLessons: "Уроки", navSettings: "Налаштування",
    titleHomework: "Домашнє завдання", subHomework: "Ваше домашнє завдання",
    titleLessons: "Уроки", subLessons: "Уроки від вашого вчителя",
    titleSettings: "Налаштування", subSettings: "Налаштування облікового запису",
    statPending: "Очікує", statSubmitted: "Здано", statGraded: "Оцінено",
    statusPending: "Очікує", statusSubmitted: "Здано", statusGraded: "Оцінено", statusOverdue: "Прострочено",
    noHomework: "Домашніх завдань ще немає", noHomeworkDesc: "Вчитель ще не задав домашнє завдання.",
    dueDate: "Здати до", dateLocale: "uk-UA",
    noLessons: "Уроків ще немає", noLessonsDesc: "Вчитель ще не поділився з вами уроками.",
    untitledLesson: "Урок без назви",
    modules: (n: number) => n === 1 ? "модуль" : n < 5 ? "модулі" : "модулів",
    startLesson: "Почати", signOut: "Вийти", student: "Учень", loading: "Завантаження...",
    notLinkedTitle: "Обліковий запис не підключено",
    notLinkedDesc: "Ваш обліковий запис не підключено до профілю учня. Зверніться до вчителя.",
    accountLabel: "Обліковий запис учня",
    changePw: "Змінити пароль", changePwDesc: "Оновіть пароль облікового запису",
    currentPw: "Поточний пароль", currentPwPlaceholder: "Введіть поточний пароль",
    newPw: "Новий пароль", newPwPlaceholder: "Мінімум 6 символів",
    confirmPw: "Підтвердіть новий пароль", confirmPwPlaceholder: "Повторіть новий пароль",
    pwTooShort: "Пароль має містити мінімум 6 символів.", pwMismatch: "Паролі не збігаються.",
    pwIncorrect: "Поточний пароль невірний.", pwFailed: "Не вдалося оновити пароль.",
    pwSuccess: "Пароль успішно оновлено!", saving: "Збереження...", updatePw: "Оновити пароль",
    languageLabel: "Мова", languageSubtitle: "Оберіть мову інтерфейсу",
    navMessages: "Повідомлення", titleMessages: "Повідомлення", subMessages: "Ваші повідомлення з вчителем",
    msgPlaceholder: "Написати повідомлення...", msgSend: "Надіслати",
    msgEmpty: "Немає повідомлень", msgEmptyDesc: "Напишіть своєму вчителю!",
    paymentReminderText: "привіт! 💛 це автоматична напоминалка про оплату абонементу) гарного дня ☺️",
    paymentReminderClose: "Зрозуміло",
  },
  pl: {
    portal: "Portal ucznia",
    navHomework: "Zadania", navLessons: "Lekcje", navSettings: "Ustawienia",
    titleHomework: "Praca domowa", subHomework: "Twoja praca domowa",
    titleLessons: "Lekcje", subLessons: "Lekcje od Twojego nauczyciela",
    titleSettings: "Ustawienia", subSettings: "Ustawienia konta",
    statPending: "Oczekuje", statSubmitted: "Oddane", statGraded: "Ocenione",
    statusPending: "Oczekuje", statusSubmitted: "Oddane", statusGraded: "Ocenione", statusOverdue: "Przeterminowane",
    noHomework: "Brak prac domowych", noHomeworkDesc: "Nauczyciel nie zadał jeszcze pracy domowej.",
    dueDate: "Oddać do", dateLocale: "pl-PL",
    noLessons: "Brak lekcji", noLessonsDesc: "Nauczyciel nie udostępnił jeszcze żadnych lekcji.",
    untitledLesson: "Lekcja bez tytułu",
    modules: (n: number) => n === 1 ? "moduł" : n < 5 ? "moduły" : "modułów",
    startLesson: "Rozpocznij", signOut: "Wyloguj się", student: "Uczeń", loading: "Ładowanie...",
    notLinkedTitle: "Konto niepowiązane",
    notLinkedDesc: "Twoje konto nie jest powiązane z profilem ucznia. Skontaktuj się z nauczycielem.",
    accountLabel: "Konto ucznia",
    changePw: "Zmień hasło", changePwDesc: "Zaktualizuj hasło do konta",
    currentPw: "Aktualne hasło", currentPwPlaceholder: "Wpisz aktualne hasło",
    newPw: "Nowe hasło", newPwPlaceholder: "Minimum 6 znaków",
    confirmPw: "Potwierdź nowe hasło", confirmPwPlaceholder: "Powtórz nowe hasło",
    pwTooShort: "Hasło musi mieć co najmniej 6 znaków.", pwMismatch: "Hasła nie są zgodne.",
    pwIncorrect: "Aktualne hasło jest nieprawidłowe.", pwFailed: "Nie udało się zaktualizować hasła.",
    pwSuccess: "Hasło zostało zaktualizowane!", saving: "Zapisywanie...", updatePw: "Zaktualizuj hasło",
    languageLabel: "Język", languageSubtitle: "Wybierz język interfejsu",
    navMessages: "Wiadomości", titleMessages: "Wiadomości", subMessages: "Twoje wiadomości z nauczycielem",
    msgPlaceholder: "Napisz wiadomość...", msgSend: "Wyślij",
    msgEmpty: "Brak wiadomości", msgEmptyDesc: "Napisz do swojego nauczyciela!",
    paymentReminderText: "Drogi/a uczniu, uprzejmie przypominamy, że nadszedł czas na dokonanie płatności za lekcje. Prosimy o uregulowanie należności w najbliższym czasie. Dziękujemy za Twoje zaangażowanie i zrozumienie! 🙏",
    paymentReminderClose: "Rozumiem",
  },
};

// Settings panel
function SettingsPanel({
  studentName, onSignOut, language, setLanguage,
}: {
  studentName: string;
  onSignOut: () => void;
  language: string;
  setLanguage: (l: string) => void;
}) {
  const t = studentTranslations[language as keyof typeof studentTranslations] ?? studentTranslations.uk;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPassword.length < 6) { setPwError(t.pwTooShort); return; }
    if (newPassword !== confirmPassword) { setPwError(t.pwMismatch); return; }
    setPwLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email found");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) { setPwError(t.pwIncorrect); setPwLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || t.pwFailed);
    } finally {
      setPwLoading(false);
    }
  };

  const langs = [
    {
      code: "uk", label: "Українська",
      flag: (
        <svg viewBox="0 0 40 28" className="w-9 h-6 rounded-sm shadow-sm">
          <rect width="40" height="14" fill="#005BBB" />
          <rect y="14" width="40" height="14" fill="#FFD500" />
        </svg>
      ),
    },
    {
      code: "pl", label: "Polski",
      flag: (
        <svg viewBox="0 0 40 28" className="w-9 h-6 rounded-sm shadow-sm">
          <rect width="40" height="14" fill="#FFFFFF" />
          <rect y="14" width="40" height="14" fill="#DC143C" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">{studentName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-navy-dark text-lg">{studentName}</p>
            <p className="text-sm text-slate-500">{t.accountLabel}</p>
          </div>
        </div>
      </div>

      {/* Language selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-navy-dark mb-1">{t.languageLabel}</h3>
        <p className="text-sm text-slate-500 mb-4">{t.languageSubtitle}</p>
        <div className="grid grid-cols-2 gap-3">
          {langs.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`flex items-center justify-center py-3 rounded-xl border-2 transition-all ${
                language === code
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-navy-dark mb-1">{t.changePw}</h3>
        <p className="text-sm text-slate-500 mb-5">{t.changePwDesc}</p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.currentPw}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">lock</span>
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={pwLoading}
                placeholder={t.currentPwPlaceholder}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.newPw}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">lock_open</span>
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={pwLoading}
                placeholder={t.newPwPlaceholder}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t.confirmPw}</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-lg">lock_open</span>
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={pwLoading}
                placeholder={t.confirmPwPlaceholder}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
              />
            </div>
          </div>
          {pwError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-600">
              <span className="material-symbols-outlined text-base">error</span>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
              <span className="material-symbols-outlined text-base">check_circle</span>
              {t.pwSuccess}
            </div>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full h-11 bg-navy-dark hover:bg-navy-light text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {pwLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.saving}
              </>
            ) : t.updatePw}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-semibold text-sm"
      >
        <span className="material-symbols-outlined text-base">logout</span>
        {t.signOut}
      </button>
    </div>
  );
}

interface SharedLessonWithContent extends SharedLesson {
  lesson?: LessonContent;
}

export default function StudentPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [homework, setHomework] = useState<StudentHomework[]>([]);
  const [sharedLessons, setSharedLessons] = useState<SharedLessonWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"homework" | "lessons" | "settings" | "messages">("homework");
  const [language, setLanguageState] = useState("uk");
  const [liveSession, setLiveSession] = useState<{ id: string; lesson_id: string; lesson_title: string; lesson_level?: string } | null>(null);

  const [teacherName, setTeacherName] = useState("Teacher");

  // Payment reminder state
  const [paymentReminder, setPaymentReminder] = useState<PaymentReminder | null>(null);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgUploading, setMsgUploading] = useState(false);
  const [msgRecording, setMsgRecording] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const msgFileRef = useRef<HTMLInputElement>(null);
  const msgMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const msgAudioChunksRef = useRef<Blob[]>([]);
  const msgChannelRef = useRef<any>(null);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("student_language", lang);
    if (studentId) {
      supabase.from("students").update({ language: lang }).eq("id", studentId).then(({ error }) => {
        if (error) console.warn("Language save to DB failed:", error.message);
      });
    }
  };

  useEffect(() => { loadStudentData(); }, []);

  const t = studentTranslations[language as keyof typeof studentTranslations] ?? studentTranslations.uk;

  const loadStudentData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const student = await fetchStudentByUserId(session.user.id);
      if (!student) { setLoading(false); return; }

      setStudentName(student.name);
      setStudentId(student.id);
      setStudentData(student);
      const savedLang = localStorage.getItem("student_language");
      setLanguageState(savedLang || (student as any).language || "uk");

      const [hw, shared, reminder, tName] = await Promise.all([
        fetchStudentHomework(student.id),
        fetchSharedLessonsForStudent(student.id),
        fetchActivePaymentReminder(student.id),
        fetchSetting('teacher_name'),
      ]);
      setPaymentReminder(reminder);
      if (tName) setTeacherName(tName);

      setHomework(hw);

      const sharedWithContent = await Promise.all(
        shared.map(async (s) => {
          const lesson = await fetchLessonContentById(s.lesson_content_id);
          return { ...s, lesson: lesson || undefined };
        })
      );
      setSharedLessons(sharedWithContent);
    } catch (err) {
      console.error("Error loading student data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when messages tab is opened
  useEffect(() => {
    if (!studentId || activeTab !== "messages") return;

    const loadAndSubscribe = async () => {
      setMsgLoading(true);
      const msgs = await fetchMessages(studentId);
      setMessages(msgs);
      setMsgLoading(false);
      await markMessagesRead(studentId, "student");
      setMsgUnread(0);
    };
    loadAndSubscribe();

    if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current);
    const channel = supabase
      .channel(`student-messages:${studentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `student_id=eq.${studentId}` },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender === "teacher") {
            await markMessagesRead(studentId, "student");
          }
        }
      )
      .subscribe();
    msgChannelRef.current = channel;

    return () => {
      if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current);
    };
  }, [studentId, activeTab]);

  // Scroll to bottom when messages change
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch unread count on load
  useEffect(() => {
    if (!studentId) return;
    fetchStudentUnreadCount(studentId).then(setMsgUnread);
  }, [studentId]);

  // Subscribe to new payment reminders in realtime
  useEffect(() => {
    if (!studentId) return;
    const ch = supabase
      .channel(`payment-reminders:${studentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_reminders", filter: `student_id=eq.${studentId}` },
        (payload) => {
          setPaymentReminder(payload.new as PaymentReminder);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [studentId]);

  const uploadMsgFile = async (file: File): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "messages");
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: formData,
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const handleSendMsg = async () => {
    if (!studentId || !msgText.trim() || msgSending) return;
    const trimmed = msgText.trim();
    setMsgText("");
    setMsgSending(true);
    const msg = await sendMessage(studentId, "student", { text: trimmed });
    if (msg) setMessages((prev) => [...prev, msg]);
    setMsgSending(false);
  };

  const handleMsgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    setMsgUploading(true);
    const url = await uploadMsgFile(file);
    if (url) {
      const msg = await sendMessage(studentId, "student", { image_url: url });
      if (msg) setMessages((prev) => [...prev, msg]);
    }
    setMsgUploading(false);
    e.target.value = "";
  };

  const startMsgRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      msgAudioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => msgAudioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!studentId) return;
        const blob = new Blob(msgAudioChunksRef.current, { type: "audio/mpeg" });
        const file = new File([blob], "voice.mp3", { type: "audio/mpeg" });
        setMsgUploading(true);
        const url = await uploadMsgFile(file);
        if (url) {
          const msg = await sendMessage(studentId, "student", { audio_url: url });
          if (msg) setMessages((prev) => [...prev, msg]);
        }
        setMsgUploading(false);
      };
      mr.start();
      msgMediaRecorderRef.current = mr;
      setMsgRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopMsgRecording = () => {
    msgMediaRecorderRef.current?.stop();
    setMsgRecording(false);
  };

  const checkLiveSession = async (sid: string) => {
    const { data } = await supabase
      .from('live_sessions')
      .select('id, lesson_id, lesson_title')
      .eq('active', true)
      .contains('invited_student_ids', [sid])
      .maybeSingle();

    if (data) {
      // Fetch lesson level
      const lesson = await fetchLessonContentById(data.lesson_id);
      setLiveSession({ ...data, lesson_level: lesson?.level });
    } else {
      setLiveSession(null);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    checkLiveSession(studentId);

    const channel = supabase
      .channel('live-session-watcher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        checkLiveSession(studentId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      a1: "bg-green-100 text-green-700", a2: "bg-teal-100 text-teal-700",
      b1: "bg-blue-100 text-blue-700", b2: "bg-indigo-100 text-indigo-700",
      c1: "bg-purple-100 text-purple-700", c2: "bg-pink-100 text-pink-700",
    };
    return colors[level?.toLowerCase()] || "bg-slate-100 text-slate-700";
  };

  const getStatusInfo = (hw: StudentHomework) => {
    const status = hw.status || "pending";
    if (status === "graded") return { label: t.statusGraded, cls: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500", icon: "workspace_premium", iconColor: "text-emerald-500" };
    if (status === "submitted") return { label: t.statusSubmitted, cls: "bg-blue-100 text-blue-700", border: "border-l-blue-400", icon: "task_alt", iconColor: "text-blue-500" };
    if (hw.due_date && new Date(hw.due_date) < new Date()) return { label: t.statusOverdue, cls: "bg-red-100 text-red-600", border: "border-l-red-400", icon: "warning", iconColor: "text-red-500" };
    return { label: t.statusPending, cls: "bg-amber-100 text-amber-700", border: "border-l-amber-400", icon: "assignment", iconColor: "text-amber-500" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">{t.notLinkedTitle}</h2>
          <p className="text-slate-500 text-sm mb-6">{t.notLinkedDesc}</p>
          <button onClick={handleSignOut} className="w-full h-11 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors">
            {t.signOut}
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = homework.filter((h) => !h.status || h.status === "pending").length;
  const submittedCount = homework.filter((h) => h.status === "submitted").length;
  const gradedCount = homework.filter((h) => h.status === "graded").length;

  const navItems = [
    { tab: "homework" as const, label: t.navHomework, icon: "assignment", badge: pendingCount },
    { tab: "lessons" as const, label: t.navLessons, icon: "menu_book", badge: sharedLessons.length },
    { tab: "messages" as const, label: t.navMessages, icon: "chat_bubble", badge: msgUnread },
  ];

  const pageTitles: Record<string, { title: string; sub: string }> = {
    homework: { title: t.titleHomework, sub: t.subHomework },
    lessons: { title: t.titleLessons, sub: t.subLessons },
    settings: { title: t.titleSettings, sub: t.subSettings },
    messages: { title: t.titleMessages, sub: t.subMessages },
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">

      {/* ── Sidebar ── desktop */}
      <aside className="hidden xl:flex w-64 bg-[#00132c] flex-col shrink-0 border-r border-[#0f2545]/50">
        <div className="p-5 flex items-center gap-3">
          <Image src="/logo.png" alt="PolSpeak" width={40} height={40} className="size-10 rounded-xl shadow-lg" />
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">PolSpeak</h1>
            <p className="text-slate-400 text-xs">{t.portal}</p>
          </div>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-1 mt-2">
          {navItems.map(({ tab, label, icon, badge }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full text-left ${active ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {icon}
                </span>
                <span className={`text-sm flex-1 ${active ? "font-bold" : "font-medium"}`}>{label}</span>
                {badge > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full text-left ${activeTab === "settings" ? "bg-white/10 text-white ring-1 ring-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <span className="material-symbols-outlined" style={activeTab === "settings" ? { fontVariationSettings: "'FILL' 1" } : undefined}>settings</span>
            <span className={`text-sm ${activeTab === "settings" ? "font-bold" : "font-medium"}`}>{t.navSettings}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-slate-400 hover:bg-red-500/10 hover:text-red-400 group w-full text-left"
          >
            <span className="material-symbols-outlined group-hover:text-red-400 transition-colors">logout</span>
            <span className="text-sm font-medium">{t.signOut}</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-3 mt-1">
            <div className="size-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{studentName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{studentName}</p>
              <p className="text-slate-400 text-[10px]">{t.student}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={`flex-1 ${activeTab === "messages" ? "overflow-hidden" : "overflow-y-auto"}`}>

        {/* ── Messages Tab (full-height chat) ── */}
        {activeTab === "messages" && (
          <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Chat header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="size-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {teacherName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{teacherName}</p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {msgLoading ? (
                <div className="flex justify-center pt-10">
                  <div className="size-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">chat_bubble_outline</span>
                  <p className="text-slate-400 text-sm font-medium">{t.msgEmpty}</p>
                  <p className="text-slate-300 text-xs mt-1">{t.msgEmptyDesc}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isStudent = msg.sender === "student";
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={msg.id} className={`flex items-end gap-1.5 ${isStudent ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${isStudent ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"}`}>
                        {msg.text && <p className="text-sm leading-relaxed break-words">{msg.text}</p>}
                        {msg.image_url && (
                          /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i.test(msg.image_url) ? (
                            <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                              <img src={msg.image_url} alt="Image" className="max-w-full rounded-lg mt-1 max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-xl border hover:opacity-80 transition-opacity ${isStudent ? "border-indigo-400/50 bg-indigo-500/20" : "border-slate-200 bg-slate-50"}`}>
                              <span className={`material-symbols-outlined text-[26px] shrink-0 ${isStudent ? "text-indigo-100" : "text-indigo-500"}`}>
                                {/\.pdf(\?|$)/i.test(msg.image_url) ? "picture_as_pdf" : /\.(doc|docx)(\?|$)/i.test(msg.image_url) ? "description" : /\.(xls|xlsx)(\?|$)/i.test(msg.image_url) ? "table_chart" : /\.(ppt|pptx)(\?|$)/i.test(msg.image_url) ? "slideshow" : /\.zip(\?|$)/i.test(msg.image_url) ? "folder_zip" : "insert_drive_file"}
                              </span>
                              <span className={`text-xs font-medium truncate max-w-[140px] ${isStudent ? "text-white" : "text-slate-700"}`}>{decodeURIComponent(msg.image_url.split("/").pop()?.split("?")[0] || "File")}</span>
                              <span className={`material-symbols-outlined text-[18px] ml-auto shrink-0 ${isStudent ? "text-indigo-200" : "text-slate-400"}`}>download</span>
                            </a>
                          )
                        )}
                        {msg.audio_url && (
                          <audio controls className="mt-1 max-w-full" style={{ height: 36 }}>
                            <source src={msg.audio_url} />
                          </audio>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${isStudent ? "text-indigo-200" : "text-slate-400"}`}>{time}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-200 px-4 pt-3 pb-[5.5rem] md:pb-[5.5rem] xl:pb-4 shrink-0">
              {msgRecording && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <span className="size-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-600 text-sm font-medium flex-1">Recording...</span>
                  <button onClick={stopMsgRecording} className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors">Stop & Send</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => msgFileRef.current?.click()} disabled={msgRecording || msgUploading || msgSending} title="Attach file" className="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 shrink-0">
                  <span className="material-symbols-outlined text-[22px]">attach_file</span>
                </button>
                <input ref={msgFileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" className="hidden" onChange={handleMsgFileChange} />
                <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendMsg(); } }} placeholder={t.msgPlaceholder} disabled={msgRecording || msgUploading} className="flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all disabled:opacity-50" />
                {msgUploading ? (
                  <div className="size-10 flex items-center justify-center shrink-0">
                    <svg className="size-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                ) : msgText.trim() ? (
                  <button onClick={handleSendMsg} disabled={msgSending} className="size-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0">
                    {msgSending ? <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <span className="material-symbols-outlined text-[20px]">send</span>}
                  </button>
                ) : (
                  <button onClick={msgRecording ? stopMsgRecording : startMsgRecording} disabled={msgSending} className={`size-10 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 shrink-0 ${msgRecording ? "bg-red-500 text-white hover:bg-red-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
                    <span className="material-symbols-outlined text-[22px]">{msgRecording ? "stop" : "mic"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Other Tabs ── */}
        {activeTab !== "messages" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 xl:pb-8">

          {/* Live Session Banner */}
          {liveSession && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="size-3 bg-red-500 rounded-full animate-pulse shrink-0" />
                <div>
                  <p className="font-bold text-red-700 text-sm">Your teacher started a live lesson!</p>
                  <p className="text-red-500 text-xs mt-0.5">{liveSession.lesson_title || 'Lesson'}</p>
                </div>
              </div>
              <a
                href={`/lessons/${liveSession.lesson_level || 'a1'}/${liveSession.lesson_id}/present?session=${liveSession.id}`}
                className="shrink-0 flex items-center gap-1.5 px-4 h-9 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-base">sensors</span>
                Join
              </a>
            </div>
          )}

          {/* Payment Reminder Banner */}
          {paymentReminder && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <img src="/reminderImage.webp" alt="" className="shrink-0 w-12 h-12 object-contain" />
              <p className="flex-1 text-sm text-amber-800 leading-relaxed">
                {t.paymentReminderText}
              </p>
              <button
                onClick={async () => {
                  await dismissPaymentReminder(paymentReminder.id);
                  setPaymentReminder(null);
                }}
                className="shrink-0 h-8 px-3 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {t.paymentReminderClose}
              </button>
            </div>
          )}

          {/* Page header */}
          <div className="flex flex-col wide:flex-row wide:items-center wide:justify-between gap-3 mb-6 wide:mb-8">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-navy-dark tracking-tight">{pageTitles[activeTab].title}</h1>
              <p className="text-text-muted text-xs sm:text-sm mt-0.5">{pageTitles[activeTab].sub}</p>
            </div>
          </div>

          {/* Stats — homework tab only */}
          {activeTab === "homework" && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
              {[
                { count: pendingCount, label: t.statPending, bg: "bg-amber-50", ring: "ring-amber-100", icon: "hourglass_empty", color: "text-amber-600", accent: "border-amber-200" },
                { count: submittedCount, label: t.statSubmitted, bg: "bg-blue-50", ring: "ring-blue-100", icon: "task_alt", color: "text-blue-600", accent: "border-blue-200" },
                { count: gradedCount, label: t.statGraded, bg: "bg-emerald-50", ring: "ring-emerald-100", icon: "workspace_premium", color: "text-emerald-600", accent: "border-emerald-200" },
              ].map(({ count, label, bg, ring, icon, color, accent }) => (
                <div key={label} className={`bg-white rounded-2xl border ${accent} p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:gap-4 gap-1.5`}>
                  <div className={`size-9 sm:size-12 rounded-xl ${bg} ring-4 ${ring} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${color} text-[18px] sm:text-2xl`}>{icon}</span>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-2xl font-bold text-navy-dark leading-none">{count}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <SettingsPanel
            studentName={studentName}
            onSignOut={handleSignOut}
            language={language}
            setLanguage={setLanguage}
          />
        )}

        {/* Homework Tab */}
        {activeTab === "homework" && (
          <div className="space-y-2.5">
            {homework.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="size-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-amber-400 text-3xl">assignment</span>
                </div>
                <p className="text-slate-800 font-semibold mb-1">{t.noHomework}</p>
                <p className="text-slate-400 text-sm">{t.noHomeworkDesc}</p>
              </div>
            ) : (
              homework.map((hw) => {
                const info = getStatusInfo(hw);
                return (
                  <button
                    key={hw.id}
                    onClick={() => router.push(`/student/homework/${hw.id}`)}
                    className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-3 p-4 cursor-pointer"
                  >
                    <div className={`size-2.5 rounded-full shrink-0 ${
                      hw.status === "graded" ? "bg-emerald-500" :
                      hw.status === "submitted" ? "bg-blue-500" :
                      hw.due_date && new Date(hw.due_date) < new Date() ? "bg-red-500" :
                      "bg-amber-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-navy-dark text-sm">{hw.title}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>
                      </div>
                      {hw.due_date && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {t.dueDate} {new Date(hw.due_date).toLocaleDateString(t.dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-xl shrink-0">chevron_right</span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === "lessons" && (
          <div className="space-y-2.5">
            {sharedLessons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="size-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-indigo-400 text-3xl">menu_book</span>
                </div>
                <p className="text-slate-800 font-semibold mb-1">{t.noLessons}</p>
                <p className="text-slate-400 text-sm">{t.noLessonsDesc}</p>
              </div>
            ) : (
              sharedLessons.map((sl) => (
                <div key={sl.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 flex items-center gap-4">
                    <div className="size-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-xl">auto_stories</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy-dark truncate text-sm">{sl.lesson?.title || t.untitledLesson}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {sl.lesson?.level && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getLevelColor(sl.lesson.level)}`}>
                            {sl.lesson.level.toUpperCase()}
                          </span>
                        )}
                        {sl.lesson?.modules && (
                          <span className="text-xs text-slate-400">{sl.lesson.modules.length} {t.modules(sl.lesson.modules.length)}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/lessons/${sl.lesson?.level}/${sl.lesson_content_id}/present`}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 h-9 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      {t.startLesson}
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        </div>
        )}
      </main>

      {/* ── Bottom nav ── mobile */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#00132c] border-t border-[#0f2545]/50">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map(({ tab, label, icon }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${active ? "text-indigo-300" : "text-slate-400 hover:text-white"}`}
              >
                <span className="material-symbols-outlined text-[24px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${activeTab === "settings" ? "text-indigo-300" : "text-slate-400 hover:text-white"}`}
          >
            <span className="material-symbols-outlined text-[24px]" style={activeTab === "settings" ? { fontVariationSettings: "'FILL' 1" } : undefined}>settings</span>
            <span className="text-[10px] font-medium">{t.navSettings}</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
