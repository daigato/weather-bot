import { NextResponse } from "next/server";
import { resolveCityKey } from "../../lib/weatherCities";
import { createClient } from "../../lib/supabaseServer";
import { readSettingsByAuthId, writeSettingsByAuthId } from "../../lib/weatherSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  const settings = await readSettingsByAuthId(user.id);
  return NextResponse.json({ 
    city: settings.cityKey,
    character: settings.character,
    notificationTime: settings.notificationTime,
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, string> = {};

    if (body.city) {
      updateData.cityKey = resolveCityKey(body.city);
    }
    if (body.character) {
      updateData.character = body.character;
    }
    if (body.notificationTime) {
      updateData.notificationTime = body.notificationTime;
    }

    if (Object.keys(updateData).length > 0) {
      await writeSettingsByAuthId(user.id, updateData);
    }

    const settings = await readSettingsByAuthId(user.id);
    return NextResponse.json({ 
      success: true, 
      city: settings.cityKey,
      character: settings.character,
      notificationTime: settings.notificationTime,
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}