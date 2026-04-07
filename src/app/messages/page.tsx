"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  fetchStudents,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  fetchUnreadMessageCounts,
  deleteMessage,
  type Student,
  type Message,
} from "@/lib/supabase-helpers";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#14b8a6","#3b82f6","#0ea5e9","#a855f7","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#d946ef","#fb923c"];
const avatarColor = (name: string) => {
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i.test(url);
const getFileIcon = (url: string) => {
  if (/\.pdf(\?|$)/i.test(url)) return "picture_as_pdf";
  if (/\.(doc|docx)(\?|$)/i.test(url)) return "description";
  if (/\.(xls|xlsx)(\?|$)/i.test(url)) return "table_chart";
  if (/\.(ppt|pptx)(\?|$)/i.test(url)) return "slideshow";
  if (/\.zip(\?|$)/i.test(url)) return "folder_zip";
  return "insert_drive_file";
};
const getFileName = (url: string) =>
  decodeURIComponent(url.split("/").pop()?.split("?")[0] || "File");

function ConfirmDeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-2xl">delete</span>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base">Delete message?</p>
            <p className="text-slate-400 text-sm mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onDelete }: { message: Message; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isTeacher = message.sender === "teacher";
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <>
      {confirmOpen && (
        <ConfirmDeleteModal
          onConfirm={() => { setConfirmOpen(false); onDelete(message.id); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      <div className={`flex items-center gap-1.5 group ${isTeacher ? "justify-end" : "justify-start"}`}>
        {/* 3-dot menu — left side for teacher messages */}
        {isTeacher && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="size-7 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all xl:opacity-0 xl:group-hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[110px]">
                <button
                  onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
            isTeacher
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
          }`}
        >
          {message.text && <p className="text-sm leading-relaxed break-words">{message.text}</p>}
          {message.image_url && (
            isImageFile(message.image_url) ? (
              <a href={message.image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.image_url}
                  alt="Image"
                  className="max-w-full rounded-lg mt-1 max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={message.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-xl border hover:opacity-80 transition-opacity ${
                  isTeacher ? "border-indigo-400/50 bg-indigo-500/20" : "border-slate-200 bg-slate-50"
                }`}
              >
                <span className={`material-symbols-outlined text-[26px] shrink-0 ${isTeacher ? "text-indigo-100" : "text-indigo-500"}`}>
                  {getFileIcon(message.image_url)}
                </span>
                <span className={`text-xs font-medium truncate max-w-[140px] ${isTeacher ? "text-white" : "text-slate-700"}`}>
                  {getFileName(message.image_url)}
                </span>
                <span className={`material-symbols-outlined text-[18px] ml-auto shrink-0 ${isTeacher ? "text-indigo-200" : "text-slate-400"}`}>
                  download
                </span>
              </a>
            )
          )}
          {message.audio_url && (
            <audio controls className="mt-1 max-w-full" style={{ height: 36 }}>
              <source src={message.audio_url} />
            </audio>
          )}
          <p className={`text-[10px] mt-1 ${isTeacher ? "text-indigo-200" : "text-slate-400"} text-right`}>{time}</p>
        </div>

        {/* 3-dot menu — right side for student messages */}
        {!isTeacher && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="size-7 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all xl:opacity-0 xl:group-hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-7 z-10 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[110px]">
                <button
                  onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function MessagesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ [id: string]: number }>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      const [studs, counts] = await Promise.all([
        fetchStudents(),
        fetchUnreadMessageCounts(),
      ]);
      setStudents(studs.filter((s: Student) => s.status === "active"));
      setUnreadCounts(counts);
    };
    init();

    // Subscribe to new unread messages from any student
    const globalChannel = supabase
      .channel("messages-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "sender=eq.student" },
        (payload) => {
          const msg = payload.new as Message;
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.student_id]: (prev[msg.student_id] || 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    const load = async () => {
      setLoadingMessages(true);
      const msgs = await fetchMessages(selectedStudentId);
      setMessages(msgs);
      setLoadingMessages(false);
      await markMessagesRead(selectedStudentId, "teacher");
      setUnreadCounts((prev) => ({ ...prev, [selectedStudentId]: 0 }));
    };
    load();

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`messages:${selectedStudentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `student_id=eq.${selectedStudentId}`,
        },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender === "student") {
            await markMessagesRead(selectedStudentId, "teacher");
            setUnreadCounts((prev) => ({ ...prev, [selectedStudentId]: 0 }));
          }
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [selectedStudentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedStudentId || !text.trim() || sending) return;
    const trimmed = text.trim();
    setText("");
    setSending(true);
    const msg = await sendMessage(selectedStudentId, "teacher", { text: trimmed });
    if (msg) setMessages((prev) => [...prev, msg]);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
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

  const deleteFileFromR2 = async (url: string) => {
    try {
      const storagePath = new URL(url).pathname.slice(1);
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });
    } catch {}
  };

  const handleDelete = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    const ok = await deleteMessage(id);
    if (!ok) return;
    if (msg?.image_url) await deleteFileFromR2(msg.image_url);
    if (msg?.audio_url) await deleteFileFromR2(msg.audio_url);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudentId) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) {
      const msg = await sendMessage(selectedStudentId, "teacher", { image_url: url });
      if (msg) setMessages((prev) => [...prev, msg]);
    }
    setUploading(false);
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!selectedStudentId) return;
        const blob = new Blob(audioChunksRef.current, { type: "audio/mpeg" });
        const file = new File([blob], "voice.mp3", { type: "audio/mpeg" });
        setUploading(true);
        const url = await uploadFile(file);
        if (url) {
          const msg = await sendMessage(selectedStudentId, "teacher", { audio_url: url });
          if (msg) setMessages((prev) => [...prev, msg]);
        }
        setUploading(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden min-w-0">

        {/* Student List Panel */}
        <div
          className={`${
            selectedStudentId ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-72 shrink-0 border-r border-slate-200 bg-white`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 xl:pr-5 pr-14">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-xl font-bold text-slate-800">Messages</h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="xl:hidden text-xs text-slate-400 mb-3">Here you can manage your student messages</p>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Student list */}
          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">No students found</p>
            ) : (
              filteredStudents.map((student) => {
                const unread = unreadCounts[student.id] || 0;
                const isActive = selectedStudentId === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-slate-50 ${
                      isActive ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="size-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: avatarColor(student.name) }}
                    >
                      {student.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          unread > 0 ? "font-bold text-slate-900" : "font-medium text-slate-700"
                        }`}
                      >
                        {student.name}
                      </p>
                      {student.level && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{student.level.toUpperCase()}</p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="size-5 bg-indigo-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {selectedStudentId ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0">
            {/* Chat header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="md:hidden size-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div
                className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: selectedStudent ? avatarColor(selectedStudent.name) : "#6366f1" }}
              >
                {selectedStudent?.initials}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selectedStudent?.name}</p>
                {selectedStudent?.level && (
                  <p className="text-xs text-slate-400">{selectedStudent.level.toUpperCase()}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {loadingMessages ? (
                <div className="flex justify-center pt-10">
                  <div className="size-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">chat_bubble_outline</span>
                  <p className="text-slate-400 text-sm font-medium">No messages yet</p>
                  <p className="text-slate-300 text-xs mt-1">Say hello to {selectedStudent?.name}!</p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} message={msg} onDelete={handleDelete} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-200 px-4 pt-3 pb-16 md:pb-[5.5rem] xl:pb-4 shrink-0">
              {recording && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <span className="size-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-600 text-sm font-medium flex-1">Recording...</span>
                  <button
                    onClick={stopRecording}
                    className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Stop & Send
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Attach */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={recording || uploading || sending}
                  title="Attach file"
                  className="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 shrink-0"
                >
                  <span className="material-symbols-outlined text-[22px]">attach_file</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Text input */}
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message..."
                  disabled={recording || uploading}
                  className="flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all disabled:opacity-50"
                />

                {/* Send or Mic */}
                {uploading ? (
                  <div className="size-10 flex items-center justify-center shrink-0">
                    <svg className="size-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : text.trim() ? (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="size-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
                  >
                    {sending ? (
                      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={sending}
                    title={recording ? "Stop recording" : "Record voice message"}
                    className={`size-10 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 shrink-0 ${
                      recording
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{recording ? "stop" : "mic"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-slate-200 block mb-3">chat_bubble_outline</span>
              <p className="text-slate-400 text-sm font-medium">Select a student to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
