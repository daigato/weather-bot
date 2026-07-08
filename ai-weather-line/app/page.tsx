"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [character, setCharacter] = useState("オカン風");
  const [morningTime, setMorningTime] = useState("07:00");
  const [noonTime, setNoonTime] = useState("12:00");
  const [nightTime, setNightTime] = useState("19:00");

  // 🔄 画面が開いたときに読み込む
  useEffect(() => {
    const savedAddress = localStorage.getItem("bot_address");
    const savedLat = localStorage.getItem("bot_latitude");
    const savedLon = localStorage.getItem("bot_longitude");
    const savedCharacter = localStorage.getItem("bot_character");
    const savedMorning = localStorage.getItem("bot_morningTime");
    const savedNoon = localStorage.getItem("bot_noonTime");
    const savedNight = localStorage.getItem("bot_nightTime");

    if (savedAddress) setAddress(savedAddress);
    if (savedLat) setLatitude(savedLat);
    if (savedLon) setLongitude(savedLon);
    if (savedCharacter) setCharacter(savedCharacter);
    if (savedMorning) setMorningTime(savedMorning);
    if (savedNoon) setNoonTime(savedNoon);
    if (savedNight) setNightTime(savedNight);
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("このブラウザでは位置情報取得に対応していません。");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lon);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const cityName = 
              data.address.city || 
              data.address.town || 
              data.address.suburb || 
              data.address.city_district || 
              "位置情報";
            setAddress(cityName);
          } else {
            setAddress("取得エリア");
          }
        } catch (error) {
          console.error("地名の取得に失敗しました:", error);
          setAddress("位置情報");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        alert(`位置情報を取得できませんでした。${error.message}`);
      }
    );
  };

  // 💾 データをブラウザとサーバーに保存する処理（地名クレンジング機能付き！）
  const handleSave = async () => {
    localStorage.setItem("bot_address", address || "");
    localStorage.setItem("bot_latitude", latitude || "");
    localStorage.setItem("bot_longitude", longitude || "");
    localStorage.setItem("bot_character", character);
    localStorage.setItem("bot_morningTime", morningTime);
    localStorage.setItem("bot_noonTime", noonTime);
    localStorage.setItem("bot_nightTime", nightTime);

    if (address) {
      const cleanCity = address.replace(/[市区町村]/g, "");

      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: cleanCity }),
        });
      } catch (error) {
        console.error("サーバーへの保存に失敗しました:", error);
      }
    }

    alert("設定を保存し、LINEボットと同期しました！");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8e7_0%,_#f8fafc_38%,_#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <section className="grid w-full gap-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          
          {/* 左側：ダッシュボード風プレビュー */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20 sm:p-8">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(56,189,248,0.12),transparent_70%)]" />
            <div className="relative space-y-4 sm:space-y-6">
              <span className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-amber-200 sm:text-sm">
                Weather Line Bot Settings
              </span>
              <div className="space-y-3">
                <h1 className="max-w-md text-3xl font-semibold tracking-tight sm:text-5xl">
                  AIお天気LINEボット 設定
                </h1>
                <p className="max-w-md text-xs leading-6 text-slate-300 sm:text-base">
                  位置情報、キャラクター、通知時間を調整して、あなたにぴったりな配信タイミングと言葉遣いを選べます。
                </p>
              </div>
            </div>

            <div className="relative mt-8 grid gap-3 grid-cols-3 sm:mt-12">
              <div className="rounded-xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 sm:text-xs">Location</p>
                <p className="mt-1 text-sm font-semibold truncate sm:mt-2 sm:text-lg">
                  {address ? address : "未設定"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 sm:text-xs">Tone</p>
                <p className="mt-1 text-sm font-semibold truncate sm:mt-2 sm:text-lg">{character}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 sm:text-xs">Schedule</p>
                <p className="mt-1 text-sm font-semibold sm:mt-2 sm:text-lg">3回/日</p>
              </div>
            </div>
          </div>

          {/* 右側：フォーム入力部 */}
          <div className="flex flex-col gap-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-8">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                設定フォーム
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                まず位置情報を取得し、ボットの話し方と通知時刻を選んでください。
              </p>
            </div>

            {/* 位置情報 */}
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-800">位置情報</p>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    {isGettingLocation ? "地名を検索中..." : address ? `地域: ${address}` : "現在地を取得します"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
                >
                  {isGettingLocation ? "取得中..." : "位置情報を取得"}
                </button>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 sm:px-4 sm:py-3 sm:text-sm">
                {latitude && longitude ? (
                  <span className="break-all">
                    緯度: {latitude} / 経度: {longitude}
                  </span>
                ) : (
                  <span>まだ位置情報は取得されていません。</span>
                )}
              </div>
            </div>

            {/* キャラクター選択 */}
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-800 sm:text-sm">キャラクター選択</span>
              <div className="relative">
                <select
                  value={character}
                  onChange={(event) => setCharacter(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-xs text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200 sm:py-3 sm:text-sm"
                >
                  <option value="オカン風">オカン風</option>
                  <option value="ツンデレ">ツンデレ</option>
                  <option value="執事風">執事風</option>
                  <option value="熱血教師風">熱血教師風</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400 text-xs">
                  ▾
                </span>
              </div>
            </label>

            {/* 通知時間設定 */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-800 sm:text-sm">通知時間設定</span>
              <div className="grid gap-2 grid-cols-3">
                <label className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:rounded-2xl sm:p-3">
                  <span className="block text-xs font-medium text-slate-600">朝</span>
                  <input
                    type="time"
                    value={morningTime}
                    onChange={(event) => setMorningTime(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-400 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                  />
                </label>
                <label className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:rounded-2xl sm:p-3">
                  <span className="block text-xs font-medium text-slate-600">昼</span>
                  <input
                    type="time"
                    value={noonTime}
                    onChange={(event) => setNoonTime(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-400 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                  />
                </label>
                <label className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:rounded-2xl sm:p-3">
                  <span className="block text-xs font-medium text-slate-600">晩</span>
                  <input
                    type="time"
                    value={nightTime}
                    onChange={(event) => setNightTime(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-400 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300 sm:mt-2 sm:px-6 sm:py-3 sm:text-sm"
            >
              保存する
            </button>
          </div>

        </section>
      </div>
    </main>
  );
}