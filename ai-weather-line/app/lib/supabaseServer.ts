import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.startsWith("your-")) {
    // プレースホルダーで初期化してクラッシュを防ぐ
    return createServerClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentから呼ばれた場合はcookieの書き込みができないため無視する。
          }
        },
      },
    }
  );
}

/**
 * サービスロールキーを使ったAdminクライアント。
 * RLSをバイパスしてDB操作が可能。LINE Webhookなどサーバーサイド専用。
 */
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.startsWith("your-") || serviceRoleKey.startsWith("your-")) {
    return createSupabaseClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}
