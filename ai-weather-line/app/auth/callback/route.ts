import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ログイン成功後、設定画面にリダイレクト
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // エラーの場合はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login`);
}
