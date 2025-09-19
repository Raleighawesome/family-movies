"use client";

import type { CSSProperties } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { initialSignupState, startSignup, type SignupFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Sending magic link…" : "Send magic link"}
    </button>
  );
}

const helperStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  color: "var(--text-muted)",
};

const fieldsetStyle: CSSProperties = {
  display: "grid",
  gap: "0.45rem",
};

export default function SignupForm() {
  const [state, formAction] = useFormState<SignupFormState, FormData>(startSignup, initialSignupState);

  return (
    <form action={formAction} style={{ display: "grid", gap: "1rem" }}>
      <fieldset style={fieldsetStyle}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required />
        <p style={helperStyle}>We’ll send all movie night updates here.</p>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <label htmlFor="profileName">Profile name</label>
        <input id="profileName" name="profileName" type="text" placeholder="Jamie" autoComplete="name" required />
        <p style={helperStyle}>This is how we’ll greet you in chats and recommendations.</p>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <label htmlFor="birthdate">Birthday</label>
        <input
          id="birthdate"
          name="birthdate"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
        />
        <p style={helperStyle}>We use birthdays to tailor age-appropriate picks.</p>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <label htmlFor="householdName">Household name</label>
        <input id="householdName" name="householdName" type="text" placeholder="The Parkers" required />
        <p style={helperStyle}>Pick something your whole crew will recognize.</p>
      </fieldset>

      <div style={{ display: "grid", gap: "0.6rem" }}>
        <SubmitButton />
        {state.status === "error" && (
          <p role="alert" style={{ ...helperStyle, color: "var(--danger)" }}>
            {state.message}
          </p>
        )}
        {state.status === "success" && (
          <p role="status" style={{ ...helperStyle, color: "var(--success)" }}>
            {state.message}
          </p>
        )}
        <p style={{ ...helperStyle, textAlign: "center" }}>
          By continuing you agree to receive a one-time email to finish creating your account.
        </p>
      </div>
    </form>
  );
}
