"use server";

export async function sendMagicLink() {
  return {
    ok: false,
    error: "Magic link sign-in is disabled while basic authentication is active.",
  } as const;
}

