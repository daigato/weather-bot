"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "確認メールを送信しました。メールを確認してアカウントを有効化してください。",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "エラーが発生しました。もう一度お試しください。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8e7_0%,_#f8fafc_38%,_#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">

          {/* ヘッダー部分 */}
          <div className="relative overflow-hidden rounded-t-[2rem] bg-slate-950 p-6 text-white sm:p-8">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(56,189,248,0.12),transparent_70%)]" />
            <div className="relative space-y-3">
              <span className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-amber-200 sm:text-sm">
                Weather Line Bot
              </span>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {isSignUp ? "アカウント作成" : "ログイン"}
              </h1>
              <p className="text-xs leading-6 text-slate-300 sm:text-sm">
                {isSignUp
                  ? "メールアドレスとパスワードで新しいアカウントを作成します。"
                  : "メールアドレスとパスワードでログインしてください。"}
              </p>
            </div>
          </div>

          {/* フォーム部分 */}
          <div className="p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-800 sm:text-sm">メールアドレス</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200 sm:py-3 sm:text-sm"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-800 sm:text-sm">パスワード</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200 sm:py-3 sm:text-sm"
                />
              </label>

              {message && (
                <div
                  className={`rounded-xl px-4 py-3 text-xs sm:text-sm ${
                    message.type === "error"
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-2 sm:px-6 sm:py-3 sm:text-sm"
              >
                {loading
                  ? "処理中..."
                  : isSignUp
                    ? "アカウントを作成"
                    : "ログイン"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                }}
                className="text-xs text-slate-500 underline transition hover:text-slate-700 sm:text-sm"
              >
                {isSignUp
                  ? "すでにアカウントをお持ちですか？ ログイン"
                  : "アカウントをお持ちでないですか？ 新規登録"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
