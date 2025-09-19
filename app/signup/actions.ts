"use server";

import { createClient } from "@/lib/supabase/server";

export type SignupFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export const initialSignupState: SignupFormState = { status: "idle" };

function normalizeInput(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export async function startSignup(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const receivedFields = Array.from(formData.keys());
  console.log("[signup] startSignup invoked", {
    receivedFields,
    fieldCount: receivedFields.length,
  });

  const email = normalizeInput(formData.get("email"));
  const profileName = normalizeInput(formData.get("profileName"));
  const householdName = normalizeInput(formData.get("householdName"));
  const birthday = normalizeInput(formData.get("birthday"));

  console.log("[signup] Normalized input", {
    emailLength: email.length,
    hasProfileName: Boolean(profileName),
    householdNameLength: householdName.length,
    birthdayLength: birthday.length,
  });

  if (!email) {
    console.warn("[signup] Missing email address");
    return { status: "error", message: "Please enter an email address." };
  }

  if (!profileName) {
    console.warn("[signup] Missing profile name");
    return { status: "error", message: "Let us know the name we should use for your profile." };
  }

  if (!householdName) {
    console.warn("[signup] Missing household name");
    return { status: "error", message: "Choose a household name to get everyone organized." };
  }

  if (!birthday) {
    console.warn("[signup] Missing birthday");
    return { status: "error", message: "We’d love to know your birthday to tailor picks for you." };
  }

  if (!isValidDate(birthday)) {
    console.warn("[signup] Invalid birthday format", { birthdayLength: birthday.length });
    return { status: "error", message: "Birthdays should be in YYYY-MM-DD format." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing. Cannot start signup.", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return {
      status: "error",
      message: "We couldn't send the magic link right now. Please try again later.",
    };
  }

  try {
    console.log("[signup] Creating Supabase client", {
      supabaseUrlLength: supabaseUrl.length,
      anonKeyLength: supabaseAnonKey.length,
    });

    const supabase = createClient();
    console.log("[signup] Supabase client created successfully");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/auth/callback`,
        data: {
          onboarding_profile_name: profileName,
          onboarding_household_name: householdName,
          onboarding_birthday: birthday,
        },
        shouldCreateUser: true,
      },
    });

    console.log("[signup] signInWithOtp response", {
      hasError: Boolean(error),
      emailDomain: email.split("@")[1] ?? "unknown",
    });

    if (error) {
      console.error("Supabase failed to send signup magic link", error);
      return { status: "error", message: error.message };
    }
  } catch (error) {
    console.error("Unexpected error while starting signup", error);
    if (error instanceof Error) {
      console.error("[signup] Error stack", error.stack);
    }
    return {
      status: "error",
      message: "We couldn't send the magic link right now. Please try again later.",
    };
  }

  console.log("[signup] Signup flow completed successfully", { emailDomain: email.split("@")[1] ?? "unknown" });

  return {
    status: "success",
    message: "Check your inbox for a magic link to complete your sign up.",
  };
}
