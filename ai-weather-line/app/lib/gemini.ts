import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * お天気情報とキャラクター設定から、AIアドバイス文章を生成する。
 * @param character キャラクター設定（オカン、ツンデレ、執事、熱血教師）
 * @param city 地域名（日本語）
 * @param description 天気説明（例：小雨、晴れ）
 * @param temp 気温（数値）
 */
export async function generateWeatherAdvice(
  character: string,
  city: string,
  description: string,
  temp: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  // GoogleGenerativeAIクライアントの初期化
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
あなたは以下のキャラクターとして、ユーザーに今日の天気と気温を踏まえたお天気アドバイスを伝えてください。

【キャラクター設定】
${character}

【天気情報】
地域: ${city}
現在の天気: ${description}
現在の気温: ${temp}度

【制約事項】
- キャラクターの口調や個性を最大限に表現してください。
  - オカン: 世話焼き、親しみやすい関西弁、「〜やで」「〜しぃや」「風邪ひかんようにね」といったお母さんらしい表現。
  - ツンデレ: ぶっきらぼう、不機嫌そう、でも実は心配している様子、「べ、別に心配してるわけじゃないんだからね！」「〜しなさいよね！」といった表現。
  - 執事: 丁寧、礼儀正しい、主（あるじ）に仕える謙虚で品格のある敬語、「お嬢様/旦那様」「〜でございます」「〜をお持ちください」といった表現。
  - 熱血教師: 熱い、情熱的、生徒を鼓舞する体育会系の口調、「いいか！」「〜だ！」「全力で挑め！」「〜を忘れるなよ！」といった表現。
- 今日の天気や気温に合わせた具体的な行動アドバイス（傘が必要か、どのような服装が良いかなど）を1つ以上含めてください。
- LINEのメッセージとして読みやすいよう、100文字〜150文字程度で簡潔にまとめてください。
- 余計な解説や「了解しました」などの前置きは一切不要です。キャラクターのアドバイス本文のみを出力してください。
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
