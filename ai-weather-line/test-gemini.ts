import { loadEnvConfig } from "@next/env";

// .env.local などの環境変数を自動読み込み
loadEnvConfig(process.cwd());

import { generateWeatherAdvice } from "./app/lib/gemini";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("your-") || apiKey.trim() === "") {
    console.log("GEMINI_API_KEY が設定されていません。.env.local に GEMINI_API_KEY を設定してください。");
    return;
  }

  try {
    console.log("Gemini API からの応答を取得中...");
    const advice = await generateWeatherAdvice("ツンデレ", "東京", "雨", 18);
    console.log("\n=== 応答の取得に成功しました ===");
    console.log(advice);
    console.log("===============================\n");
  } catch (error) {
    console.error("Gemini呼び出しテスト中にエラーが発生しました:", error);
  }
}

test();
