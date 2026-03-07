"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Public pages that don't require auth
const PUBLIC_PATHS = ["/", "/login/teacher", "/login/student"];

// Pages only accessible by students (exact match or /student/*)
const STUDENT_PATHS = ["/student"];

// Pages accessible to both roles (lesson present view)
const isPresentPath = (path: string) => path.endsWith("/present");

const isStudentPath = (path: string) =>
  STUDENT_PATHS.some((p) => path === p || path.startsWith(p + "/"));

// Pages only accessible by teachers (everything else that's protected, except present pages)
const isTeacherPath = (path: string) =>
  !PUBLIC_PATHS.includes(path) && !isStudentPath(path) && !isPresentPath(path);

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!PUBLIC_PATHS.includes(pathname)) {
            router.push("/");
          }
          setIsLoading(false);
          return;
        }

        const role = session.user.user_metadata?.role;
        const isStudent = role === "student";

        // Student trying to access teacher pages
        if (isStudent && isTeacherPath(pathname)) {
          router.push("/student");
          return;
        }

        // Teacher trying to access student pages
        if (!isStudent && isStudentPath(pathname)) {
          router.push("/dashboard");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    if (!PUBLIC_PATHS.includes(pathname)) {
      checkAuth();
    } else {
      setIsLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const awaiting2FA = sessionStorage.getItem("awaiting_2fa") === "true";

      if (!session && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/");
      } else if (session && PUBLIC_PATHS.includes(pathname) && !awaiting2FA) {
        const role = session.user.user_metadata?.role;
        if (role === "student") {
          router.push("/student");
        } else {
          router.push("/dashboard");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname) && !isPresentPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
