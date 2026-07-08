import { NextResponse } from "next/server";
import { cityMap, defaultCityKey, resolveCityKey } from "../../lib/weatherCities";
import { readSavedCityKey, writeSavedCityKey } from "../../lib/weatherSettings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = body.events;

    if (!events || events.length === 0) {
      return new Response("No events", { status: 200 });
    }

    const event = events[0];
    const replyToken = event.replyToken;

    // 📍 1. ユーザーから【純粋な位置情報オブジェクト】が送られてきた場合の処理
    if (event.type === "message" && event.message.type === "location") {
      const title = event.message.title || "";
      const address = event.message.address || "";
      
      const detectedCity = resolveCityKey(`${address}${title}`);

      try {
        await writeSavedCityKey(detectedCity);
      } catch (err) {
        console.error("LINEからの位置情報保存に失敗:", err);
      }

      const replyMessage = `おっ、位置情報送ってくれたな！\n【${detectedCity}】に設定しといたで！\n次から「マイ天気」って言われたら、ここの天気を教えるわな〜！`;

      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_SECRET}`,
        },
        body: JSON.stringify({
          replyToken: replyToken,
          messages: [{ type: "text", text: replyMessage }],
        }),
      });

      return new Response("OK", { status: 200 });
    }

    // 📝 2. ここからは【テキストメッセージ（文字）】が届いたときの処理
    if (event.type !== "message" || event.message.type !== "text") {
      return new Response("Not a text or location message", { status: 200 });
    }

    const userMessage = event.message.text;
    let replyMessage = "「マイ天気」って話しかけるか、左下の「＋」から位置情報を送ってな〜！";
    let targetCityKey = "";

    // 「マイ天気」と送られた場合
    if (userMessage.includes("マイ天気")) {
      try {
        targetCityKey = await readSavedCityKey();
      } catch (err) {
        console.error("設定の取得に失敗:", err);
        targetCityKey = defaultCityKey;
      }
    } else {
      // 従来の「地名 + 天気」で探す処理
      for (const key of Object.keys(cityMap)) {
        if (userMessage.includes(key)) {
          targetCityKey = key;
          break;
        }
      }
    }

    // お天気を取得して返信する処理
    if (targetCityKey && (userMessage.includes("天気") || userMessage.includes("マイ天気"))) {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const cityData = cityMap[targetCityKey];

      try {
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${cityData.en},jp&appid=${apiKey}&lang=ja&units=metric`
        );
        const weatherData = await weatherRes.json();

        if (weatherData && weatherData.weather) {
          const description = weatherData.weather[0].description;
          const temp = Math.round(weatherData.main.temp);

          if (userMessage.includes("マイ天気")) {
            replyMessage = `いま設定されてる【${cityData.ja}】のお天気やな！\n今は【${description}】で、気温は ${temp}度 やわ！`;
          } else {
            replyMessage = `${cityData.ja}の今のお天気は【${description}】やて！\n気温は ${temp}度 やわ。`;
          }
        } else {
          replyMessage = `ごめん、${cityData.ja}のお天気データがうまく探せんかったわ…！`;
        }
      } catch (err) {
        console.error(err);
        replyMessage = "お天気サーバーがちょっと機嫌悪いみたいやわ。";
      }
    } else if (userMessage.includes("天気")) {
      replyMessage = "どこの天気が知りたいん？「大阪 天気」か、位置情報を送ってから「マイ天気」って話しかけてや！";
    }

    // LINEに返信
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_SECRET}`,
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: "text", text: replyMessage }],
      }),
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}