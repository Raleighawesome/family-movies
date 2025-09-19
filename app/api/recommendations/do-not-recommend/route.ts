import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getUnauthorizedResponseHeaders } from "@/lib/auth/server";
import { getActiveHouseholdContext } from "@/lib/households";

type BlockPayload = {
  movieId: string;
  householdId?: string;
};

export async function POST(request: NextRequest) {
  const user = getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401,
      headers: getUnauthorizedResponseHeaders(),
    });
  }

  let body: BlockPayload;
  try {
    body = (await request.json()) as BlockPayload;
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

  const webhookUrl = process.env.N8N_BLOCK_RECOMMENDATION_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: body.movieId, householdId: targetHouseholdId }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Webhook error: ${response.status}`);
      }
    } catch (error) {
      console.error("Do-not-recommend webhook failed", error);
      return NextResponse.json({ error: "Unable to update preferences" }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true });
}
