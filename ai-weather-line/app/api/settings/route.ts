import { NextResponse } from "next/server";
import { defaultCityKey, resolveCityKey } from "../../lib/weatherCities";
import { readSavedCityKey, writeSavedCityKey } from "../../lib/weatherSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  const city = await readSavedCityKey();
  return NextResponse.json({ city });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.city) {
      const city = resolveCityKey(body.city);
      await writeSavedCityKey(city);
      return NextResponse.json({ success: true, city });
    }

    return NextResponse.json({ success: true, city: defaultCityKey });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}