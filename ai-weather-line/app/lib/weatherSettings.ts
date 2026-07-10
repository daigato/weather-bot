import fs from "fs";
import path from "path";

// 保存するデータの型（notificationTime を追加）
interface Settings {
  cityKey: string;
  character: string;
  notificationTime: string; // ⬅️ 追加（"07:00"、"08:00"、"off" など）
}

const settingsFilePath = path.join(process.cwd(), "weather_settings.json");

const defaultSettings: Settings = {
  cityKey: "東京",
  character: "オカン",
  notificationTime: "off", // ⬅️ 初期値はオフ
};

export async function readSettings(): Promise<Settings> {
  try {
    if (!fs.existsSync(settingsFilePath)) {
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2), "utf8");
      return defaultSettings;
    }
    const data = fs.readFileSync(settingsFilePath, "utf8");
    const parsed = JSON.parse(data);
    return {
      cityKey: parsed.cityKey || defaultSettings.cityKey,
      character: parsed.character || defaultSettings.character,
      notificationTime: parsed.notificationTime || defaultSettings.notificationTime, // ⬅️ 追加
    };
  } catch (err) {
    return defaultSettings;
  }
}

export async function writeSettings(newSettings: Partial<Settings>): Promise<void> {
  try {
    let current = defaultSettings;
    if (fs.existsSync(settingsFilePath)) {
      try {
        const data = fs.readFileSync(settingsFilePath, "utf8");
        current = JSON.parse(data);
      } catch (e) {
        current = defaultSettings;
      }
    }
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(settingsFilePath, JSON.stringify(updated, null, 2), "utf8");
  } catch (err) {
    console.error("書き込み失敗:", err);
  }
}

export async function readSavedCityKey() { const s = await readSettings(); return s.cityKey; }
export async function writeSavedCityKey(cityKey: string) { await writeSettings({ cityKey }); }