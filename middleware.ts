import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getBasicAuthChallenge, getUserFromCredentials, parseBasicAuthorizationHeader } from "./lib/auth/basic";

const PUBLIC_PATHS = [/^\/favicon\.ico$/, /^\/robots\.txt$/, /^\/manifest\.webmanifest$/, /^\/sitemap\.xml$/];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const credentials = getUserFromCredentials(
    parseBasicAuthorizationHeader(request.headers.get("authorization"))
  );

  if (credentials) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": getBasicAuthChallenge() },
  });
}

export const config = {
  matcher: "/:path*",
};
