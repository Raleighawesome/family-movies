"use server";

export type SignupFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export const initialSignupState: SignupFormState = { status: "idle" };

export async function startSignup(
  _prevState: SignupFormState,
  _formData: FormData
): Promise<SignupFormState> {
  return {
    status: "error",
    message: "Email sign-up is disabled while basic authentication is enabled.",
  };
}
