"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Not authenticated, redirect to login
          router.push('/');
          return;
        }

        // Check if this session exists and is active in database
        const { data: dbSession, error } = await supabase
          .from('user_sessions')
          .select('id, is_active')
          .eq('session_token', session.access_token)
          .eq('is_active', true)
          .single();

        if (error || !dbSession) {
          // Session was removed remotely, sign out
          console.log('Session was terminated remotely');
          await supabase.auth.signOut();
          router.push('/');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    // Only check auth if not on login page
    if (pathname !== '/') {
      checkAuth();
    } else {
      setIsLoading(false);
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Check if we're awaiting 2FA verification
      const awaiting2FA = sessionStorage.getItem('awaiting_2fa') === 'true';

      if (!session && pathname !== '/') {
        router.push('/');
      } else if (session && pathname === '/' && !awaiting2FA) {
        // Only redirect to dashboard if not waiting for 2FA
        router.push('/dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Show loading spinner while checking auth
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

  // Don't render protected content until authenticated
  if (!isAuthenticated && pathname !== '/') {
    return null;
  }

  return <>{children}</>;
}
