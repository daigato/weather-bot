import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { defaultCityKey, resolveCityKey } from "./weatherCities";

const settingsFilePath = path.join(process.cwd(), "data", "weather-settings.json");

export async function readSavedCityKey() {
  try {
    const fileContent = await readFile(settingsFilePath, "utf8");
    const parsed = JSON.parse(fileContent) as { city?: string };
    return resolveCityKey(parsed.city);
  } catch {
    return defaultCityKey;
  }
}

export async function writeSavedCityKey(city: string) {
  await mkdir(path.dirname(settingsFilePath), { recursive: true });
  await writeFile(settingsFilePath, JSON.stringify({ city }, null, 2), "utf8");
}