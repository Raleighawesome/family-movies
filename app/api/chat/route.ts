import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getUnauthorizedResponseHeaders } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdContext } from "@/lib/households";
import type { RecommendationMovie } from "@/types/db";

type ChatRequestPayload = {
  message: string;
  householdId?: string;
  filters?: { labelKey: string; maxIntensity: number; hardNo: boolean }[];
  history?: { role: string; content: string }[];
};

type ChatResponsePayload = {
  message: string;
  recommendations?: RecommendationMovie[];
  id?: string;
};

async function persistMessage(
  supabase: ReturnType<typeof createClient>,
  payload: {
    householdId: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, unknown> | null;
    userId: string | null;
  }
) {
  const { error } = await supabase.from("household_chat_messages").insert({
    household_id: payload.householdId,
    role: payload.role,
    content: payload.content,
    metadata: payload.metadata ?? null,
    user_id: payload.userId,
  });

  if (error && (error as { code?: string }).code !== "42P01") {
    console.error("Failed to persist chat message", error);
  }
}

export async function POST(request: NextRequest) {
  const user = getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401,
      headers: getUnauthorizedResponseHeaders(),
    });
  }

  const supabase = createClient();

  let body: ChatRequestPayload;
  try {
    body = (await request.json()) as ChatRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const context = await getActiveHouseholdContext();
  if (!context) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const targetHouseholdId = body.householdId && body.householdId === context.householdId
    ? body.householdId
    : context.householdId;

  await persistMessage(supabase, {
    householdId: targetHouseholdId,
    role: "user",
    content: message,
    metadata: { filters: body.filters, history: body.history },
    userId: context.user.id,
  });

  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;
  let responsePayload: ChatResponsePayload = {
    message: "I’m ready when you are! (No agent configured yet.)",
  };

  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          householdId: targetHouseholdId,
          filters: body.filters,
          history: body.history,
        }),
      });

      const rawText = await webhookResponse.text();
      if (!webhookResponse.ok) {
        throw new Error(rawText || `Webhook error: ${webhookResponse.status}`);
      }

      try {
        const parsed = JSON.parse(rawText) as ChatResponsePayload;
        responsePayload = {
          message: typeof parsed.message === "string" ? parsed.message : rawText,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : undefined,
          id: parsed.id,
        };
      } catch {
        responsePayload = { message: rawText };
      }
    } catch (error) {
      console.error("Chat webhook failed", error);
      responsePayload = {
        message: "The movie assistant is unavailable right now. Please try again shortly.",
      };
    }
  } else {
    responsePayload = {
      message: `Preview response: you said “${message}”. Configure N8n to enable full conversations.`,
    };
  }

  await persistMessage(supabase, {
    householdId: targetHouseholdId,
    role: "assistant",
    content: responsePayload.message,
    metadata: responsePayload.recommendations ? { recommendations: responsePayload.recommendations } : null,
    userId: null,
  });

  return NextResponse.json(responsePayload);
}
