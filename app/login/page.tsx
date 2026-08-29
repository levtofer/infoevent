"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error || "Invalid login credentials (´w`)");
      }
    } catch {
      setError("An unexpected network error occurred (TwT)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center p-4">
      {/* Back button placed directly above the card container */}
      <div className="max-w-md w-full mb-3 flex items-center justify-start">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      {/* Main Form Card */}
      <div className="sketch-border sketch-shadow bg-white/70 p-7 sm:p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-ink" />
            <span className="text-2xl sm:text-3xl sketch-underline">
              InfoEvent Admin
            </span>
          </div>
          <p className="text-xs text-ink/60 pt-1">
            Sign in to access your event manager and Instagram imports {">:3"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose/40 border-2 border-ink text-ink text-xs p-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink/50 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-white/80 border-2 border-ink pl-10 pr-3 py-2.5 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink/50 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/80 border-2 border-ink pl-10 pr-3 py-2.5 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sketch-btn bg-rose w-full py-2.5 text-base font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
