import { createAdminClient } from "./supabaseServer";

// 保存するデータの型
export interface Settings {
  cityKey: string;
  character: string;
  notificationTime: string;
}

const defaultSettings: Settings = {
  cityKey: "東京",
  character: "オカン",
  notificationTime: "off",
};

/**
 * Supabase Auth のユーザーID（UUID）で設定を読み込む。
 * レコードが存在しない場合はデフォルト設定を返す。
 */
export async function readSettingsByAuthId(authUserId: string): Promise<Settings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_settings")
      .select("city_key, character, notification_time")
      .eq("user_id", authUserId)
      .single();

    if (error || !data) {
      return defaultSettings;
    }

    return {
      cityKey: data.city_key || defaultSettings.cityKey,
      character: data.character || defaultSettings.character,
      notificationTime: data.notification_time || defaultSettings.notificationTime,
    };
  } catch (err) {
    return defaultSettings;
  }
}

/**
 * Supabase Auth のユーザーID（UUID）で設定を書き込む（upsert）。
 */
export async function writeSettingsByAuthId(
  authUserId: string,
  newSettings: Partial<Settings>
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const updateData: Record<string, string> = {};
    if (newSettings.cityKey) updateData.city_key = newSettings.cityKey;
    if (newSettings.character) updateData.character = newSettings.character;
    if (newSettings.notificationTime) updateData.notification_time = newSettings.notificationTime;

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: authUserId,
          ...updateData,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("設定の書き込みに失敗しました:", error);
    }
  } catch (err) {
    console.error("書き込み失敗:", err);
  }
}

/**
 * LINE ユーザーID で設定を読み込む。
 * レコードが存在しない場合はデフォルト設定を返す。
 */
export async function readSettingsByLineId(lineUserId: string): Promise<Settings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_settings")
      .select("city_key, character, notification_time")
      .eq("line_user_id", lineUserId)
      .single();

    if (error || !data) {
      return defaultSettings;
    }

    return {
      cityKey: data.city_key || defaultSettings.cityKey,
      character: data.character || defaultSettings.character,
      notificationTime: data.notification_time || defaultSettings.notificationTime,
    };
  } catch (err) {
    return defaultSettings;
  }
}

/**
 * LINE ユーザーID で設定を書き込む。
 * line_user_id に紐づくレコードが存在する場合のみ更新する。
 * レコードが存在しない場合は何もしない（Web UIでアカウント作成とLINE連携が先に必要）。
 */
export async function writeSettingsByLineId(
  lineUserId: string,
  newSettings: Partial<Settings>
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const updateData: Record<string, string> = {};
    if (newSettings.cityKey) updateData.city_key = newSettings.cityKey;
    if (newSettings.character) updateData.character = newSettings.character;
    if (newSettings.notificationTime) updateData.notification_time = newSettings.notificationTime;

    // line_user_id に紐づくレコードがあれば更新
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("line_user_id", lineUserId)
      .single();

    if (existing) {
      await supabase
        .from("user_settings")
        .update(updateData)
        .eq("line_user_id", lineUserId);
    }
    // レコードが無い場合は何もしない
  } catch (err) {
    console.error("書き込み失敗:", err);
  }
}

/**
 * Web UIで作成されたユーザー設定（user_id）に、LINEのユーザーID（line_user_id）を紐づける
 */
export async function linkLineAccount(
  authUserId: string,
  lineUserId: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // まず user_id が存在するか確認
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", authUserId)
      .single();

    if (!existing) {
      return false; // ユーザーが存在しない
    }

    // line_user_id を更新
    const { error } = await supabase
      .from("user_settings")
      .update({ line_user_id: lineUserId })
      .eq("user_id", authUserId);

    if (error) {
      console.error("連携の更新に失敗しました:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("連携処理中にエラー:", err);
    return false;
  }
}

// 後方互換性のためのエイリアス（段階的に移行するため）
export async function readSettings(userId?: string): Promise<Settings> {
  if (!userId) return defaultSettings;
  return readSettingsByLineId(userId);
}

export async function writeSettings(newSettings: Partial<Settings>, userId?: string): Promise<void> {
  if (!userId) return;
  return writeSettingsByLineId(userId, newSettings);
}