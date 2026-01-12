"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 2FA states
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !show2FAInput) {
        router.push('/dashboard');
      }
    });
  }, [router, show2FAInput]);

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
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Check if 2FA is required
      if (data.user) {
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        const totpFactor = mfaData?.totp?.[0];

        if (totpFactor && totpFactor.status === 'verified') {
          // Set flag to prevent AuthGuard from redirecting
          sessionStorage.setItem('awaiting_2fa', 'true');

          // 2FA is enabled, show verification screen
          setFactorId(totpFactor.id);
          setShow2FAInput(true);
          setLoading(false);
          return;
        }
      }

      // No 2FA required, proceed to dashboard
      if (data.session) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!factorId) {
      setError('2FA setup error. Please try logging in again.');
      setLoading(false);
      return;
    }

    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        setError('2FA challenge failed. Please try again.');
        setLoading(false);
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: twoFactorCode,
      });

      if (verifyError) {
        setError('Invalid verification code');
        setLoading(false);
        return;
      }

      // Clear the 2FA awaiting flag
      sessionStorage.removeItem('awaiting_2fa');
      router.push('/dashboard');
    } catch (err) {
      setError('Verification failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-navy-dark/60"></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-lg px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center border border-white/20">
            <span className="material-symbols-outlined text-white text-2xl">
              school
            </span>
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold">PolSpeak</h1>
            <p className="text-white/70 text-xs">Learn Polish with Passion</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-navy-dark">Welcome Back</h2>
            <p className="text-text-muted text-sm mt-1">
              Sign in to your account
            </p>
          </div>

          {!show2FAInput ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-navy-dark mb-2">
                  Email
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
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-dark mb-2">
                  Password
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
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
                    placeholder="Enter your password"
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
                className="w-full h-12 bg-navy-dark hover:bg-navy-light text-white font-semibold rounded-xl shadow-lg shadow-navy-dark/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 text-white animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="text-center mb-6">
                <div className="size-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-indigo-600 text-3xl">shield</span>
                </div>
                <h3 className="text-lg font-semibold text-navy-dark mb-1">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-dark mb-2 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full h-14 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-navy-dark focus:border-navy-dark transition-all outline-none"
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // Clear 2FA flag and log out when going back
                    sessionStorage.removeItem('awaiting_2fa');
                    supabase.auth.signOut();
                    setShow2FAInput(false);
                    setTwoFactorCode("");
                    setError("");
                  }}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length !== 6}
                  className="flex-1 h-12 bg-navy-dark hover:bg-navy-light text-white font-semibold rounded-xl shadow-lg shadow-navy-dark/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-5 w-5 text-white animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/50 text-xs mt-6">
          © 2025 PolSpeak. All rights reserved.
        </p>
      </div>
    </div>
  );
}
