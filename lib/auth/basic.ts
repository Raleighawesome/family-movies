const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? "admin";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD ?? process.env.BASIC_AUTH_PASS ?? "movies";
const DEFAULT_USER_EMAIL = process.env.BASIC_AUTH_DEFAULT_EMAIL ?? "eriknewby@icloud.com";
const DEFAULT_USER_ID = process.env.BASIC_AUTH_DEFAULT_USER_ID ?? "basic-auth-user";

function decodeBase64(value: string): string {
  if (typeof atob === "function") {
    try {
      return atob(value);
    } catch (error) {
      console.warn("[auth] Failed to decode using atob", error);
    }
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf-8");
  }
  throw new Error("No base64 decoder available in this environment");
}

export type BasicCredentials = { username: string; password: string };

export function parseBasicAuthorizationHeader(headerValue: string | null): BasicCredentials | null {
  if (!headerValue) return null;
  const [scheme, encoded] = headerValue.split(" ");
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return null;
  try {
    const decoded = decodeBase64(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch (error) {
    console.warn("[auth] Failed to parse basic auth header", error);
    return null;
  }
}

export type AuthenticatedBasicUser = {
  id: string;
  email: string;
  username: string;
};

export function getUserFromCredentials(credentials: BasicCredentials | null): AuthenticatedBasicUser | null {
  if (!credentials) return null;
  if (credentials.username !== BASIC_AUTH_USER) return null;
  if (credentials.password !== BASIC_AUTH_PASSWORD) return null;
  return {
    id: DEFAULT_USER_ID,
    email: DEFAULT_USER_EMAIL,
    username: credentials.username,
  };
}

export function getBasicAuthChallenge(): string {
  return 'Basic realm="Family Movies"';
}
