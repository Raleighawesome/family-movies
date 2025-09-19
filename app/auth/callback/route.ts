import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/", req.url));

  const redirectTo = url.searchParams.get("next") || "/";
  return NextResponse.redirect(new URL(redirectTo, req.url));
}

