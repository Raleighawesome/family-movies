import { headers } from "next/headers";
import {
  getBasicAuthChallenge,
  getUserFromCredentials,
  parseBasicAuthorizationHeader,
  type AuthenticatedBasicUser,
} from "./basic";

export type AuthenticatedUser = AuthenticatedBasicUser;

export function getAuthenticatedUser(): AuthenticatedUser | null {
  const headerStore = headers();
  const authorization = headerStore.get("authorization");
  return getUserFromCredentials(parseBasicAuthorizationHeader(authorization));
}

export function assertAuthenticatedUser(): AuthenticatedUser {
  const user = getAuthenticatedUser();
  if (!user) {
    const challenge = getBasicAuthChallenge();
    const error = new Error("Basic authentication required");
    (error as { status?: number }).status = 401;
    (error as { headers?: Record<string, string> }).headers = { "WWW-Authenticate": challenge };
    throw error;
  }
  return user;
}

export function getUnauthorizedResponseHeaders(): Record<string, string> {
  return { "WWW-Authenticate": getBasicAuthChallenge() };
}
