"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const role = session.user.user_metadata?.role;
        if (role === "student") {
          router.push("/student");
        } else {
          router.push("/dashboard");
        }
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Неправильний email або пароль");
        setLoading(false);
        return;
      }

      if (data.user) {
        if (data.user.user_metadata?.role !== "student") {
          await supabase.auth.signOut();
          setError("Цей обліковий запис не є учнівським. Використовуйте вхід для вчителя.");
          setLoading(false);
          return;
        }
      }

      if (data.session) {
        router.push("/student");
      }
    } catch {
      setError("Помилка входу. Спробуйте ще раз.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-navy-dark/60"></div>

      <div className="relative z-10 w-full max-w-lg px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="NastyKnowledge"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl"
            priority
          />
          <div>
            <h1 className="text-white text-2xl font-bold">NastyKnowledge</h1>
            <p className="text-white/70 text-xs">Вивчайте польську з пристрастю</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/"
              className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 text-xl">
                arrow_back
              </span>
            </Link>
            <div>
              <h2 className="text-xl font-bold text-navy-dark">Вхід для учнів</h2>
              <p className="text-text-muted text-xs">Перегляньте свої уроки та завдання</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-2">
                Електронна пошта
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-xl">
                    mail
                  </span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="Введіть вашу пошту"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-dark mb-2">
                Пароль
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-xl">
                    lock
                  </span>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="Введіть ваш пароль"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Вхід...
                </>
              ) : (
                "Увійти"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          © 2025 NastyKnowledge. Всі права захищено.
        </p>
      </div>
    </div>
  );
}
