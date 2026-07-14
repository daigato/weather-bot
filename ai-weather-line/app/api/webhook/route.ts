import { NextResponse } from "next/server";
import { cityMap, defaultCityKey, resolveCityKey } from "../../lib/weatherCities";
import { readSettingsByLineId, writeSettingsByLineId, linkLineAccount } from "../../lib/weatherSettings";
import type { Settings } from "../../lib/weatherSettings";
import { generateWeatherAdvice } from "../../lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = body.events;

    if (!events || events.length === 0) {
      return new Response("No events", { status: 200 });
    }

    const event = events[0];
    const replyToken = event.replyToken;
    const lineUserId = event.source?.userId;

    let settings: Settings = { cityKey: defaultCityKey, character: "オカン", notificationTime: "off" };
    if (lineUserId) {
      try {
        settings = await readSettingsByLineId(lineUserId);
      } catch (e) {}
    }

    // 📍 1. 位置情報処理
    if (event.type === "message" && event.message.type === "location") {
      const title = event.message.title || "";
      const address = event.message.address || "";
      const detectedCity = resolveCityKey(`${address}${title}`);

      if (lineUserId) {
        await writeSettingsByLineId(lineUserId, { cityKey: detectedCity });
      }
      const cityNameJa = cityMap[detectedCity]?.ja || detectedCity;
      
      let replyMessage = `【${cityNameJa}】に設定しといたで！\n次から「マイ天気」って言われたら、ここの天気を教えるわな〜！`;
      if (settings.character === "ツンデレ") {
        replyMessage = `べ、別にアンタのために【${cityNameJa}】に設定したわけじゃないんだからね！\n次から「マイ天気」って言いなさいよね！`;
      }

      await sendLineReply(replyToken, [{ type: "text", text: replyMessage }]);
      return new Response("OK", { status: 200 });
    }

    // 📝 2. テキストメッセージ処理
    if (event.type !== "message" || event.message.type !== "text") {
      return new Response("Not a text or location message", { status: 200 });
    }

    const userMessage = event.message.text;

    // ──────────────────────────────────────────
    // 📖 新機能：ルールブック（使い方）の出力
    // ──────────────────────────────────────────
    if (userMessage === "使い方" || userMessage === "ルールブック" || userMessage === "ヘルプ") {
      let introText = "はいな！これがお天気通知の使い方やで。困ったらこれ見てな〜！\n\n";
      if (settings.character === "ツンデレ") {
        introText = "ふん、使い方もわからないの？仕方ないから教えてあげるわよ。ちゃんと覚えなさいよね！\n\n";
      }

      const ruleBookText = introText + 
        "【コマンド一覧】\n" +
        "・天気 / マイ天気\n" +
        " ➡️ 登録した地域の今の天気を教えてくれるよ\n" +
        "・[地名] 天気 (例: 富山 天気)\n" +
        " ➡️ その場所のピンポイントの天気を教えてくれるよ\n" +
        "・キャラ / キャラ変更\n" +
        " ➡️ オカンやツンデレに性格を変更できるよ\n" +
        "・時間 / 通知\n" +
        " ➡️ 毎朝の自動通知時間を決めるボタンが出るよ\n" +
        "・＋ボタン(位置情報)\n" +
        " ➡️ マイ天気で調べる地域を変更することができるよ\n" +
        "・使い方 / ルールブック / ヘルプ\n" +
        " ➡️ このルールブックを表示するよ\n";

      await sendLineReply(replyToken, [{ type: "text", text: ruleBookText }]);
      return new Response("OK", { status: 200 });
    }

    // ──────────────────────────────────────────
    // 🔗 新機能：Webアカウントとの連携
    // ──────────────────────────────────────────
    if (userMessage.startsWith("連携：")) {
      const authUserId = userMessage.replace("連携：", "").trim();
      
      if (!lineUserId) {
        await sendLineReply(replyToken, [{ type: "text", text: "LINEのユーザー情報が取得できへんかったわ。" }]);
        return new Response("OK", { status: 200 });
      }

      // UUIDの形式かざっくりチェック
      if (authUserId.length !== 36) {
        await sendLineReply(replyToken, [{ type: "text", text: "連携コードが間違ってるみたいやで。もう一回確認してな！" }]);
        return new Response("OK", { status: 200 });
      }

      const success = await linkLineAccount(authUserId, lineUserId);

      if (success) {
        await sendLineReply(replyToken, [{ type: "text", text: "アカウントの連携が完了したで！\nWebで設定した内容が反映されるようになったわ！" }]);
      } else {
        await sendLineReply(replyToken, [{ type: "text", text: "連携に失敗したわ…。Web側でログインして設定を保存してから、もう一回試してみてな！" }]);
      }
      return new Response("OK", { status: 200 });
    }

    // ──────────────────────────────────────────
    // 🎭 機能A: キャラクター変更のボタンを出す
    // ──────────────────────────────────────────
    if (userMessage === "キャラ" || userMessage === "キャラ変更") {
      let askText = `今のキャラクターは【${settings.character}】やで！\nどのキャラに変更する？`;
      if (settings.character === "ツンデレ") {
        askText = `今は【${settings.character}】になってるわよ。\n他のキャラに変えたいの？べ、別にいいけど…`;
      }

      const quickReplyMessage = {
        type: "text",
        text: askText,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "オカン", text: "設定：オカン" } },
            { type: "action", action: { type: "message", label: "ツンデレ", text: "設定：ツンデレ" } }
          ]
        }
      };
      await sendLineReply(replyToken, [quickReplyMessage]);
      return new Response("OK", { status: 200 });
    }

    if (userMessage.startsWith("設定：")) {
      const selectedChar = userMessage.replace("設定：", "").trim();
      if (lineUserId) {
        await writeSettingsByLineId(lineUserId, { character: selectedChar });
      }
      let replyText = `ほな、これからは【${selectedChar}】が天気を教えるわな！`;
      if (selectedChar === "ツンデレ") replyText = "ふん、これからは私がアンタに天気を教えてあげるわ。感謝しなさいよね！";
      await sendLineReply(replyToken, [{ type: "text", text: replyText }]);
      return new Response("OK", { status: 200 });
    }

    // ──────────────────────────────────────────
    // ⏰ 機能B: 通知時間の変更ボタンを出す
    // ──────────────────────────────────────────
    if (userMessage === "時間" || userMessage === "通知") {
      const displayTime = settings.notificationTime === "off" ? "オフ" : settings.notificationTime;
      
      let askText = `いまの通知時間は【${displayTime}】やで！\n毎朝何時に通知してほしい？`;
      if (settings.character === "ツンデレ") {
        askText = `いまの通知時間は【${displayTime}】よ。\n毎朝何時に起こしてほしいのよ？`;
      }

      const quickReplyMessage = {
        type: "text",
        text: askText,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "朝 7:00", text: "時間設定：07:00" } },
            { type: "action", action: { type: "message", label: "朝 8:00", text: "時間設定：08:00" } },
            { type: "action", action: { type: "message", label: "通知をオフ", text: "時間設定：off" } }
          ]
        }
      };
      await sendLineReply(replyToken, [quickReplyMessage]);
      return new Response("OK", { status: 200 });
    }

    if (userMessage.startsWith("時間設定：")) {
      const selectedTime = userMessage.replace("時間設定：", "").trim();
      if (lineUserId) {
        await writeSettingsByLineId(lineUserId, { notificationTime: selectedTime });
      }
      
      let replyText = selectedTime === "off"
        ? "了解や！毎朝の自動通知は止めておくわな。"
        : `ほな、毎朝【${selectedTime}】にその日の天気を自動で送るようにするわな！`;
        
      if (settings.character === "ツンデレ") {
        replyText = selectedTime === "off"
          ? "ふん、起こしてあげないんだからね。"
          : `毎朝【${selectedTime}】に起こしてあげるわ。遅刻したら承知しないんだからね！`;
      }
      
      await sendLineReply(replyToken, [{ type: "text", text: replyText }]);
      return new Response("OK", { status: 200 });
    }

    // ──────────────────────────────────────────
    // 🌤️ 機能C: お天気案内
    // ──────────────────────────────────────────
    let replyMessage = settings.character === "オカン" 
      ? "使い方がわからんかったら、「使い方」って話しかけてな〜！"
      : "使い方もわからないなら、「使い方」って話しかけなさいよ！";
      
    let targetCityKey = "";

    if (userMessage.includes("マイ天気") || userMessage === "天気") {
      targetCityKey = settings.cityKey;
    } else {
      for (const key of Object.keys(cityMap)) {
        if (userMessage.includes(key)) {
          targetCityKey = key;
          break;
        }
      }
    }

    if (targetCityKey) {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const cityData = cityMap[targetCityKey];

      if (cityData) {
        try {
          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${cityData.en},jp&appid=${apiKey}&lang=ja&units=metric`
          );
          const weatherData = await weatherRes.json();

          if (weatherData && weatherData.weather) {
            const description = weatherData.weather[0].description;
            const temp = Math.round(weatherData.main.temp);

            // Gemini APIによるアドバイス生成を試みる
            try {
              replyMessage = await generateWeatherAdvice(
                settings.character,
                cityData.ja,
                description,
                temp
              );
            } catch (geminiErr) {
              console.error("Geminiアドバイスの生成に失敗しました。フォールバック文言を使用します:", geminiErr);
              // フォールバック
              if (settings.character === "ツンデレ") {
                replyMessage = `アンタが設定した【${cityData.ja}】の天気よ！\n今は【${description}】で、気温は ${temp}度 だからね。`;
              } else if (settings.character === "執事") {
                replyMessage = `設定されております【${cityData.ja}】の現在の天気は【${description}】、気温は ${temp}度 でございます。`;
              } else if (settings.character === "熱血教師") {
                replyMessage = `設定された【${cityData.ja}】の天気だ！\n現在は【${description}】、気温は ${temp}度 だぞ！気合を入れていけ！`;
              } else {
                replyMessage = `いま設定されてる【${cityData.ja}】のお天気やな！\n今は【${description}】で、気温は ${temp}度 やわ！`;
              }
            }
          }
        } catch (err) {
          replyMessage = "お天気サーバーがちょっと機嫌悪いみたい。";
        }
      }
    }

    await sendLineReply(replyToken, [{ type: "text", text: replyMessage }]);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function sendLineReply(replyToken: string, messages: any[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_SECRET;
  
  if (!token) {
    console.error("❌ LINE_CHANNEL_ACCESS_TOKEN が設定されていません。");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("❌ LINEメッセージの送信に失敗しました:", response.status, errorBody);
  }
}