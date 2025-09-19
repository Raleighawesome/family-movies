"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveHouseholdContext } from "@/lib/households";
import { DEFAULT_FILTERS } from "@/lib/filters";

const DEFAULT_INTENSITY = 5;
const DEBUG_PREFIX = "[preferences/actions]";

type ActionResult = { ok: boolean; error?: string };

type UpdatePayload = {
  labelKey: string;
  maxIntensity: number;
  hardNo: boolean;
};

type BulkAddPayload = {
  labels: string[];
};

type BulkRemovePayload = {
  labels: string[];
};

function debug(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`${DEBUG_PREFIX} ${message}`, details);
  } else {
    console.log(`${DEBUG_PREFIX} ${message}`);
  }
}

function debugError(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.error(`${DEBUG_PREFIX} ${message}`, details);
  } else {
    console.error(`${DEBUG_PREFIX} ${message}`);
  }
}

function revalidate() {
  revalidatePath("/preferences");
  revalidatePath("/");
}

function sanitizeLabel(label: string): string {
  return label.trim();
}

function intensityGuard(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_INTENSITY;
  const rounded = Math.round(value);
  return Math.min(10, Math.max(1, rounded));
}

export async function updateFilter(payload: UpdatePayload): Promise<ActionResult> {
  debug("updateFilter invoked", { payload });

  try {
    const labelKey = sanitizeLabel(payload.labelKey);
    if (!labelKey) {
      debugError("updateFilter missing label", { payload });
      return { ok: false, error: "Label is required" };
    }

    const { householdId } = await requireActiveHouseholdContext();
    debug("updateFilter resolved household", { householdId, labelKey });

    const hardNo = Boolean(payload.hardNo);
    const maxIntensity = hardNo ? 0 : intensityGuard(payload.maxIntensity);
    debug("updateFilter sanitized values", { householdId, labelKey, hardNo, maxIntensity });

    const supabase = createClient();
    const response = await supabase
      .from("household_filter_limits")
      .upsert(
        {
          household_id: householdId,
          label_key: labelKey,
          hard_no: hardNo,
          max_intensity: maxIntensity,
        },
        { onConflict: "household_id,label_key" }
      );

    if (response.error) {
      debugError("updateFilter supabase error", {
        message: response.error.message,
        code: (response.error as { code?: string }).code,
        details: response.error.details,
        hint: (response.error as { hint?: string }).hint,
        status: response.status,
        statusText: response.statusText,
      });
      return { ok: false, error: response.error.message };
    }

    debug("updateFilter supabase success", {
      householdId,
      labelKey,
      status: response.status,
      statusText: response.statusText,
    });

    revalidate();
    return { ok: true };
  } catch (cause) {
    debugError("updateFilter threw", {
      cause,
    });
    return { ok: false, error: cause instanceof Error ? cause.message : "Unable to update filter" };
  }
}

export async function addFilters(payload: BulkAddPayload): Promise<ActionResult> {
  const labels = (payload.labels ?? []).map(sanitizeLabel).filter(Boolean);
  if (!labels.length) {
    return { ok: false, error: "Add at least one filter" };
  }

  const unique = Array.from(new Map(labels.map((label) => [label.toLowerCase(), label])).values());
  const { householdId } = await requireActiveHouseholdContext();
  const supabase = createClient();

  const { data: existingData } = await supabase
    .from("household_filter_limits")
    .select("label_key")
    .eq("household_id", householdId);

  const existing = new Set((existingData ?? []).map((row: { label_key: string }) => row.label_key.toLowerCase()));
  const rows = unique
    .filter((label) => !existing.has(label.toLowerCase()))
    .map((label) => {
      const preset = DEFAULT_FILTERS.find((filter) => filter.labelKey.toLowerCase() === label.toLowerCase());
      return {
        household_id: householdId,
        label_key: label,
        hard_no: false,
        max_intensity: preset?.defaultIntensity ?? DEFAULT_INTENSITY,
      };
    });

  if (!rows.length) {
    return { ok: false, error: "Those filters already exist" };
  }

  const { error } = await supabase.from("household_filter_limits").insert(rows);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidate();
  return { ok: true };
}

export async function removeFilters(payload: BulkRemovePayload): Promise<ActionResult> {
  const labels = (payload.labels ?? []).map(sanitizeLabel).filter(Boolean);
  if (!labels.length) {
    return { ok: false, error: "Select at least one filter to remove" };
  }

  const { householdId } = await requireActiveHouseholdContext();
  const supabase = createClient();

  const { error } = await supabase
    .from("household_filter_limits")
    .delete()
    .eq("household_id", householdId)
    .in("label_key", labels);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidate();
  return { ok: true };
}

export async function resetFilters(): Promise<ActionResult> {
  const { householdId } = await requireActiveHouseholdContext();
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("household_filter_limits")
    .delete()
    .eq("household_id", householdId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const rows = DEFAULT_FILTERS.map((filter) => ({
    household_id: householdId,
    label_key: filter.labelKey,
    hard_no: false,
    max_intensity: filter.defaultIntensity,
  }));

  const { error: insertError } = await supabase.from("household_filter_limits").insert(rows);
  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidate();
  return { ok: true };
}
