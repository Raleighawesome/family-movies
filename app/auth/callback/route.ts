import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/", req.url));

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  // After exchange, the auth cookies are set
  const redirectTo = url.searchParams.get("next") || "/";
  return NextResponse.redirect(new URL(redirectTo, req.url));
}

