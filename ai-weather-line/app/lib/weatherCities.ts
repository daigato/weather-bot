export const cityMap: Record<string, { en: string; ja: string }> = {
  東京: { en: "Tokyo", ja: "東京" },
  大阪: { en: "Osaka", ja: "大阪" },
  京都: { en: "Kyoto", ja: "京都" },
  福岡: { en: "Fukuoka", ja: "福岡" },
  北海道: { en: "Sapporo", ja: "北海道" },
  札幌: { en: "Sapporo", ja: "札幌" },
  名古屋: { en: "Nagoya", ja: "名古屋" },
  沖縄: { en: "Okinawa", ja: "沖縄" },
  横浜: { en: "Yokohama", ja: "横浜" },
  神戸: { en: "Kobe", ja: "神戸" },
  広島: { en: "Hiroshima", ja: "広島" },
  仙台: { en: "Sendai", ja: "仙台" },
  富山: { en: "Toyama", ja: "富山" },
};

export const defaultCityKey = "東京";

export function resolveCityKey(value: string | null | undefined) {
  if (!value) {
    return defaultCityKey;
  }

  const normalizedValue = value.replace(/\s+/g, "");

  for (const key of Object.keys(cityMap)) {
    if (normalizedValue.includes(key) || key.includes(normalizedValue)) {
      return key;
    }
  }

  return defaultCityKey;
}