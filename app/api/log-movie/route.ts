import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdContext } from "@/lib/households";

type LogMoviePayload = {
  movieId: string;
  watchDate?: string;
  watchedBy?: string[];
  rating?: number | null;
  householdId?: string;
};

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LogMoviePayload;
  try {
    body = (await request.json()) as LogMoviePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.movieId) {
    return NextResponse.json({ error: "movieId is required" }, { status: 400 });
  }

  const context = await getActiveHouseholdContext();
  if (!context) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const targetHouseholdId = body.householdId && body.householdId === context.householdId
    ? body.householdId
    : context.householdId;

  const payload = {
    movieId: body.movieId,
    watchDate: body.watchDate,
    watchedBy: Array.isArray(body.watchedBy) ? body.watchedBy : undefined,
    rating: typeof body.rating === "number" ? body.rating : undefined,
    householdId: targetHouseholdId,
  };

  const webhookUrl = process.env.N8N_LOG_MOVIE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Webhook error: ${response.status}`);
      }
    } catch (error) {
      console.error("Log movie webhook failed", error);
      return NextResponse.json({ error: "Unable to log the movie right now" }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true });
}
