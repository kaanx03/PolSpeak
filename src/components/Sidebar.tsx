"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  hideHamburger?: boolean;
  hideProfileMenu?: boolean;
}

interface Settings {
  teacherName: string;
  teacherEmail: string;
  teacherPhoto: string;
  language: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
    lessonReminders: boolean;
  };
}

export default function Sidebar({ hideHamburger = false, hideProfileMenu = false }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings>({
    teacherName: "Anastasiia",
    teacherEmail: "",
    teacherPhoto: "/teacher.jpg", // Default photo
    language: "en",
    theme: "light",
    notifications: {
      email: true,
      push: true,
      lessonReminders: true,
    },
  });
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => {
    setMounted(true);
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    // Try to load profile photo from Supabase first
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: files } = await supabase.storage
        .from('lesson-files')
        .list('profile-photos', {
          search: user.id
        });

      let photoUrl = "/teacher.jpg"; // Default photo
      if (files && files.length > 0) {
        const photoFile = files[0];
        const { data: { publicUrl } } = supabase.storage
          .from('lesson-files')
          .getPublicUrl(`profile-photos/${photoFile.name}`);
        photoUrl = publicUrl;
      }

      setSettings(prev => ({
        ...prev,
        teacherPhoto: photoUrl
      }));
    }
  };

  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = async () => {
      // Reload profile photo from Supabase (don't load from localStorage)
      loadUserSettings();
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-page updates
    window.addEventListener("settings-updated" as any, handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settings-updated" as any, handleStorageChange);
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Only hide in actual presentation mode (/lessons/.../present), not in /presentation list page
  const isPresentationMode = pathname?.includes("/present") && !pathname?.endsWith("/presentation");

  return (
    <>
      {/* Profile Menu Button - Tablet & Mobile (not in presentation mode) */}
      {!isPresentationMode && !hideHamburger && !hideProfileMenu && (
        <div className="xl:hidden fixed top-4 right-4 z-50" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="size-10 rounded-full border-2 border-indigo-500 overflow-hidden shadow-lg hover:scale-105 transition-transform bg-white"
            aria-label="Profile menu"
          >
            <img
              src={settings.teacherPhoto}
              alt={settings.teacherName}
              className="w-full h-full object-cover"
            />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{settings.teacherName}</p>
                <p className="text-xs text-slate-500 truncate">{settings.teacherEmail || "Teacher"}</p>
              </div>
              <a
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-700"
                onClick={() => setShowProfileMenu(false)}
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <span className="text-sm font-medium">Settings</span>
              </a>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop Sidebar (xl and above - 1280px+) */}
      <aside
        className={`
          fixed xl:relative
          w-64
          flex-shrink-0 flex-col justify-between
          bg-[#00132c] h-full
          transition-all duration-300
          border-r border-[#0f2545]/50
          z-40
          hidden xl:flex
        `}
      >
        <div className="flex flex-col gap-6 p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 aspect-square rounded-xl size-10 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <span className="material-symbols-outlined text-white text-xl">
                school
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-lg font-bold leading-tight tracking-tight">
                PolSpeak
              </h1>
              <p className="text-slate-400 text-xs font-normal">Teaching Toolkit</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1 mt-4">
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname === "/dashboard"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/dashboard"
            >
              <span
                className={`material-symbols-outlined ${
                  mounted && pathname === "/dashboard" ? "text-indigo-400" : "group-hover:text-white"
                }`}
                style={mounted && pathname === "/dashboard" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                dashboard
              </span>
              <span className={`text-sm ${mounted && pathname === "/dashboard" ? "font-bold" : "font-medium"}`}>Dashboard</span>
            </a>
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname === "/library"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/library"
            >
              <span
                className={`material-symbols-outlined ${
                  mounted && pathname === "/library" ? "text-indigo-400" : "group-hover:text-white"
                }`}
                style={mounted && pathname === "/library" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                library_books
              </span>
              <span className={`text-sm ${mounted && pathname === "/library" ? "font-bold" : "font-medium"}`}>Library</span>
            </a>
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname === "/students"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/students"
            >
              <span
                className={`material-symbols-outlined ${
                  mounted && pathname === "/students" ? "text-indigo-400" : "group-hover:text-white"
                }`}
                style={mounted && pathname === "/students" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                groups
              </span>
              <span className={`text-sm ${mounted && pathname === "/students" ? "font-bold" : "font-medium"}`}>Students</span>
            </a>
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname.startsWith("/lessons")
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/lessons"
            >
              <span
                className={`material-symbols-outlined transition-colors ${
                  mounted && pathname.startsWith("/lessons") ? "text-indigo-400" : "group-hover:text-white"
                }`}
                style={mounted && pathname.startsWith("/lessons") ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                book_2
              </span>
              <span className={`text-sm ${mounted && pathname.startsWith("/lessons") ? "font-bold" : "font-medium"}`}>Lessons</span>
            </a>
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname === "/schedule"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/schedule"
            >
              <span
                className={`material-symbols-outlined ${
                  mounted && pathname === "/schedule" ? "text-indigo-400" : "group-hover:text-white transition-colors"
                }`}
                style={mounted && pathname === "/schedule" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                calendar_month
              </span>
              <span className={`text-sm ${mounted && pathname === "/schedule" ? "font-bold" : "font-medium"}`}>Schedule</span>
            </a>
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname === "/curriculum"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/curriculum"
            >
              <span
                className={`material-symbols-outlined ${
                  mounted && pathname === "/curriculum" ? "text-indigo-400" : "group-hover:text-white transition-colors"
                }`}
                style={mounted && pathname === "/curriculum" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                menu_book
              </span>
              <span className={`text-sm ${mounted && pathname === "/curriculum" ? "font-bold" : "font-medium"}`}>Curriculum</span>
            </a>
            <a
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                mounted && pathname === "/presentation"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white group"
              }`}
              href="/presentation"
            >
              <span
                className={`material-symbols-outlined ${
                  mounted && pathname === "/presentation" ? "text-indigo-400" : "group-hover:text-white transition-colors"
                }`}
                style={mounted && pathname === "/presentation" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                slideshow
              </span>
              <span className={`text-sm ${mounted && pathname === "/presentation" ? "font-bold" : "font-medium"}`}>Presentation</span>
            </a>
          </nav>
        </div>
        <div className="p-4 border-t border-white/5 flex flex-col gap-2">
          <a
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
              mounted && pathname === "/settings"
                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            href="/settings"
          >
            <span
              className={`material-symbols-outlined ${
                mounted && pathname === "/settings" ? "text-indigo-400" : "group-hover:text-white transition-colors"
              }`}
              style={mounted && pathname === "/settings" ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              settings
            </span>
            <span className={`text-sm ${mounted && pathname === "/settings" ? "font-bold" : "font-medium"}`}>Settings</span>
          </a>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-slate-400 hover:bg-red-500/10 hover:text-red-400 group"
          >
            <span className="material-symbols-outlined group-hover:text-red-400 transition-colors">
              logout
            </span>
            <span className="text-sm font-medium">Logout</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-3 mt-2">
            <img
              src={settings.teacherPhoto}
              alt={settings.teacherName}
              className="size-8 rounded-full object-cover border border-white/10"
            />
            <div className="flex flex-col">
              <p className="text-white text-xs font-semibold">{settings.teacherName}</p>
              <p className="text-slate-400 text-[10px]">Teacher</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation - Mobile & Tablet (hide on desktop, hide in presentation mode) */}
      {!isPresentationMode && (
        <nav className="flex xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#00132c] border-t border-[#0f2545]/50">
          <div className="w-full flex items-center justify-around px-2 py-2 max-w-7xl mx-auto">
            {/* Dashboard */}
            <a
              href="/dashboard"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname === "/dashboard"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname === "/dashboard" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                dashboard
              </span>
              <span className="text-[10px] font-medium hidden md:block">Dashboard</span>
            </a>

            {/* Library */}
            <a
              href="/library"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname === "/library"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname === "/library" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                library_books
              </span>
              <span className="text-[10px] font-medium hidden md:block">Library</span>
            </a>

            {/* Students */}
            <a
              href="/students"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname === "/students"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname === "/students" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                groups
              </span>
              <span className="text-[10px] font-medium hidden md:block">Students</span>
            </a>

            {/* Lessons */}
            <a
              href="/lessons"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname.startsWith("/lessons")
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname.startsWith("/lessons") ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                book_2
              </span>
              <span className="text-[10px] font-medium hidden md:block">Lessons</span>
            </a>

            {/* Schedule */}
            <a
              href="/schedule"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname === "/schedule"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname === "/schedule" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                calendar_month
              </span>
              <span className="text-[10px] font-medium hidden md:block">Schedule</span>
            </a>

            {/* Curriculum */}
            <a
              href="/curriculum"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname === "/curriculum"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname === "/curriculum" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                menu_book
              </span>
              <span className="text-[10px] font-medium hidden md:block">Curriculum</span>
            </a>

            {/* Presentation */}
            <a
              href="/presentation"
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                mounted && pathname === "/presentation"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px] md:text-[24px]"
                style={mounted && pathname === "/presentation" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                slideshow
              </span>
              <span className="text-[10px] font-medium hidden md:block">Present</span>
            </a>
          </div>
        </nav>
      )}
    </>
  );
}
