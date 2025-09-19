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
  const email = normalizeInput(formData.get("email"));
  const profileName = normalizeInput(formData.get("profileName"));
  const householdName = normalizeInput(formData.get("householdName"));
  const birthday = normalizeInput(formData.get("birthday"));

  if (!email) {
    return { status: "error", message: "Please enter an email address." };
  }

  if (!profileName) {
    return { status: "error", message: "Let us know the name we should use for your profile." };
  }

  if (!householdName) {
    return { status: "error", message: "Choose a household name to get everyone organized." };
  }

  if (!birthday) {
    return { status: "error", message: "We’d love to know your birthday to tailor picks for you." };
  }

  if (!isValidDate(birthday)) {
    return { status: "error", message: "Birthdays should be in YYYY-MM-DD format." };
  }

  const supabase = createClient();
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

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "Check your inbox for a magic link to complete your sign up.",
  };
}
