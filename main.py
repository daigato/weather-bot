"""AIお天気LINEボット (Python / FastAPI 単一ファイル構成).

起動コマンド:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import hashlib
import hmac
import json
import os
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
import requests

# .env ファイルから環境変数を読み込む
load_dotenv()

LINE_CHANNEL_ACCESS_TOKEN = (
    os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
    or os.getenv("LINE_CHANNEL_SECRET", "").strip()
)
RAW_SECRET = os.getenv("LINE_CHANNEL_SECRET", "").strip()
LINE_CHANNEL_SECRET = RAW_SECRET if len(RAW_SECRET) <= 64 else ""

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

app = FastAPI(title="AI Weather LINE Bot")

# 主要都市とOpenWeatherMap検索用英語名のマッピング
CITY_MAP: dict[str, dict[str, str]] = {
    "東京": {"en": "Tokyo", "ja": "東京"},
    "大阪": {"en": "Osaka", "ja": "大阪"},
    "京都": {"en": "Kyoto", "ja": "京都"},
    "福岡": {"en": "Fukuoka", "ja": "福岡"},
    "北海道": {"en": "Sapporo", "ja": "北海道（札幌）"},
    "札幌": {"en": "Sapporo", "ja": "札幌"},
    "名古屋": {"en": "Nagoya", "ja": "名古屋"},
    "沖縄": {"en": "Naha", "ja": "沖縄"},
    "横浜": {"en": "Yokohama", "ja": "横浜"},
    "神戸": {"en": "Kobe", "ja": "神戸"},
    "広島": {"en": "Hiroshima", "ja": "広島"},
    "仙台": {"en": "Sendai", "ja": "仙台"},
    "富山": {"en": "Toyama", "ja": "富山"},
}

CHARACTER_RULES: dict[str, str] = {
    "オカン": "世話焼きで親しみやすい関西のお母さん。関西弁（「〜やで」「〜しぃや」）で話す。",
    "ツンデレ": "強がりだが根は優しいツンデレ（「べ、別にアンタのためじゃないんだからね！」）。",
    "執事": "品格のある丁寧な執事（「〜でございます」「お気をつけていってらっしゃいませ」）。",
    "ギャル": "明るくテンションが高いギャル（「マジで」「〜だし！✨」）。",
}

# サーバー稼働中のみ保持する軽量インメモリ設定（DB不要のステートレス構成）
user_characters: dict[str, str] = {}


def verify_signature(body_bytes: bytes, signature: Optional[str]) -> bool:
    """LINE Webhookの署名 (X-Line-Signature) を検証する."""
    if not LINE_CHANNEL_SECRET:
        return True
    if not signature:
        return False
    mac = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).digest()
    expected = base64.b64encode(mac).decode("utf-8")
    return hmac.compare_digest(expected, signature)


def detect_city(text: str) -> str:
    """テキストから都市名を抽出し、見つからなければデフォルト（東京）を返す."""
    for city_key in CITY_MAP:
        if city_key in text:
            return city_key
    return "東京"


def get_clothing_advice(temp: int) -> str:
    """気温（℃）から服装の目安を判定する."""
    if temp >= 26:
        return "半袖Tシャツ・薄手の服装（熱中症対策を！）"
    elif temp >= 21:
        return "長袖シャツ・薄手のカットソー"
    elif temp >= 16:
        return "カーディガン・パーカー・軽めのジャケット"
    elif temp >= 12:
        return "トレンチコート・秋物ジャケット・セーター"
    elif temp >= 7:
        return "冬物コート・厚手ニット"
    else:
        return "ダウンジャケット・マフラーなどの防寒着"


def fetch_weather(
    city_key: str = "東京",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Optional[dict[str, Any]]:
    """OpenWeatherMap APIから現在の天気と気温を取得する."""
    if not OPENWEATHER_API_KEY:
        return None

    url = "https://api.openweathermap.org/data/2.5/weather"
    if lat is not None and lon is not None:
        params: dict[str, Any] = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "lang": "ja",
            "units": "metric",
        }
    else:
        city_en = CITY_MAP.get(city_key, CITY_MAP["東京"])["en"]
        params = {
            "q": f"{city_en},jp",
            "appid": OPENWEATHER_API_KEY,
            "lang": "ja",
            "units": "metric",
        }

    try:
        res = requests.get(url, params=params, timeout=8)
        res.raise_for_status()
        data = res.json()
        return {
            "description": data["weather"][0]["description"],
            "temp": round(data["main"]["temp"]),
            "humidity": data["main"]["humidity"],
        }
    except Exception:
        return None


def generate_advice(
    user_message: str,
    character: str,
    city_ja: str,
    weather: Optional[dict[str, Any]],
) -> str:
    """Gemini API（またはフォールバック）でお天気・服装アドバイスを生成する."""
    if not weather:
        return f"【{city_ja}】の天気データが取得できへんかったわ。少し待ってからもう一回試してな！"

    temp = weather["temp"]
    desc = weather["description"]
    clothing = get_clothing_advice(temp)
    needs_umbrella = any(k in desc for k in ("雨", "雪", "雷"))

    # Gemini API キーが設定されている場合は AI でキャラクター応答を生成
    if GEMINI_API_KEY:
        rule = CHARACTER_RULES.get(character, CHARACTER_RULES["オカン"])
        prompt = (
            f"あなたはLINE Botとして「{character}」（{rule}）になりきって120文字程度で返答してください。\n"
            f"【気象情報】地域: {city_ja} / 天気: {desc} / 気温: {temp}℃ / 推奨服装: {clothing}\n"
            f"【ユーザーの質問】{user_message}"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        try:
            res = requests.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=10,
            )
            if res.ok:
                candidates = res.json().get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"].strip()
        except Exception:
            pass

    # フォールバック（ルールベース応答）
    umbrella_text = "傘を忘れんと持っていきや！" if needs_umbrella else "今日は傘はいらなさそうやで！"
    return (
        f"【{city_ja}】の今の天気は【{desc}】で、気温は【{temp}℃】やで！\n"
        f"服装は「{clothing}」がちょうどええわ。\n{umbrella_text}"
    )


def send_line_reply(reply_token: str, text: str, quick_reply: Optional[dict[str, Any]] = None) -> None:
    """LINE Messaging API (Reply) でメッセージを返信する."""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return

    default_quick_reply = {
        "items": [
            {"type": "action", "action": {"type": "location", "label": "📍 現在地の天気"}},
            {"type": "action", "action": {"type": "message", "label": "🌤️ 東京の天気", "text": "東京の天気"}},
            {"type": "action", "action": {"type": "message", "label": "👔 今日何着る？", "text": "今日何着る？"}},
            {"type": "action", "action": {"type": "message", "label": "🎭 キャラ変更", "text": "キャラ変更"}},
        ]
    }

    message_obj: dict[str, Any] = {
        "type": "text",
        "text": text,
        "quickReply": quick_reply or default_quick_reply,
    }

    requests.post(
        "https://api.line.me/v2/bot/message/reply",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        },
        json={"replyToken": reply_token, "messages": [message_obj]},
        timeout=8,
    )


@app.get("/")
def health_check() -> dict[str, str]:
    """AWS ヘルスチェック用エンドポイント."""
    return {"status": "ok", "service": "ai-weather-line-bot"}


@app.post("/api/webhook")
@app.post("/webhook")
async def webhook(
    request: Request,
    x_line_signature: Optional[str] = Header(default=None),
) -> dict[str, str]:
    """LINE Messaging API Webhook エンドポイント."""
    body_bytes = await request.body()
    if not verify_signature(body_bytes, x_line_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    body = json.loads(body_bytes.decode("utf-8"))
    events = body.get("events", [])

    for event in events:
        if event.get("type") != "message":
            continue

        reply_token = event.get("replyToken")
        user_id = event.get("source", {}).get("userId", "default")
        character = user_characters.get(user_id, "オカン")
        msg = event.get("message", {})
        msg_type = msg.get("type")

        # 1. 位置情報メッセージの場合
        if msg_type == "location":
            lat = float(msg.get("latitude", 35.6812))
            lon = float(msg.get("longitude", 139.7671))
            address = msg.get("address", "現在地")
            weather = fetch_weather(lat=lat, lon=lon)
            reply_text = generate_advice("現在地の天気と服装を教えて", character, address, weather)
            send_line_reply(reply_token, reply_text)

        # 2. テキストメッセージの場合
        elif msg_type == "text":
            user_text = msg.get("text", "").strip()

            if user_text == "キャラ変更":
                char_quick_reply = {
                    "items": [
                        {
                            "type": "action",
                            "action": {"type": "message", "label": c, "text": f"設定：{c}"},
                        }
                        for c in CHARACTER_RULES
                    ]
                }
                send_line_reply(
                    reply_token,
                    f"今のキャラは【{character}】やで！どれに変える？",
                    quick_reply=char_quick_reply,
                )
            elif user_text.startswith("設定："):
                selected = user_text.replace("設定：", "").strip()
                if selected in CHARACTER_RULES:
                    user_characters[user_id] = selected
                    send_line_reply(reply_token, f"キャラクターを【{selected}】に変更したで！")
            else:
                city_key = detect_city(user_text)
                city_ja = CITY_MAP[city_key]["ja"]
                weather = fetch_weather(city_key=city_key)
                reply_text = generate_advice(user_text, character, city_ja, weather)
                send_line_reply(reply_token, reply_text)

    return {"status": "ok"}
