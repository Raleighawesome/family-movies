"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import styles from "./preferences-panel.module.css";
import { addFilters, removeFilters, resetFilters, updateFilter } from "@/app/preferences/actions";
import { DEFAULT_FILTERS, formatFilterLabel } from "@/lib/filters";

type FilterView = {
  labelKey: string;
  maxIntensity: number;
  hardNo: boolean;
};

type PreferencesPanelProps = {
  filters: FilterView[];
  householdName: string | null;
};

type ToastState = { kind: "success" | "error"; text: string } | null;

const DEFAULT_INTENSITY = 5;
const DEBUG_PREFIX = "[preferences/panel]";
const INTENSITY_DESCRIPTORS = [
  "None",
  "Trace",
  "Faint",
  "Soft",
  "Moderate",
  "Notable",
  "Bold",
  "Strong",
  "Intense",
  "No filter",
] as const;

function cloneFilters(list: FilterView[]): FilterView[] {
  return list.map((item) => ({ ...item }));
}

function createFilterSignature(list: FilterView[]): string {
  return list
    .map((filter) => `${filter.labelKey}::${filter.maxIntensity}::${filter.hardNo ? 1 : 0}`)
    .sort()
    .join("|");
}

function describeIntensity(value: number): string {
  if (!Number.isFinite(value)) return INTENSITY_DESCRIPTORS[DEFAULT_INTENSITY - 1];
  const index = Math.min(INTENSITY_DESCRIPTORS.length - 1, Math.max(0, Math.round(value) - 1));
  return INTENSITY_DESCRIPTORS[index];
}

function parseInputList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function PreferencesPanel({ filters, householdName }: PreferencesPanelProps) {
  const [filterRows, setFilterRows] = useState<FilterView[]>(filters);
  const [persistedFilters, setPersistedFilters] = useState<FilterView[]>(filters);
  const [selectedForRemoval, setSelectedForRemoval] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastIntensityRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (pendingSignature) {
      const incomingSignature = createFilterSignature(filters);
      if (incomingSignature !== pendingSignature) {
        return;
      }
    }

    setFilterRows(filters);
    setPersistedFilters(filters);
    setSelectedForRemoval([]);
    setPendingSignature(null);
  }, [filters, pendingSignature]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const formattedFilters = useMemo(
    () =>
      filterRows.map((filter) => ({
        ...filter,
        label: formatFilterLabel(filter.labelKey),
      })),
    [filterRows]
  );

  const handleIntensityChange = (labelKey: string, value: number) => {
    setFilterRows((prev) =>
      prev.map((filter) =>
        filter.labelKey === labelKey
          ? { ...filter, maxIntensity: Math.min(10, Math.max(0, Math.round(value))) }
          : filter
      )
    );
  };

  const handleHardNoToggle = (labelKey: string, checked: boolean) => {
    setFilterRows((prev) =>
      prev.map((filter) => {
        if (filter.labelKey !== labelKey) {
          return filter;
        }

        if (checked) {
          const previous = filter.maxIntensity > 0 ? filter.maxIntensity : DEFAULT_INTENSITY;
          lastIntensityRef.current.set(labelKey, previous);
          return { ...filter, hardNo: true, maxIntensity: 0 };
        }

        const fallback = lastIntensityRef.current.get(labelKey);
        const persisted = persistedFilters.find((item) => item.labelKey === labelKey)?.maxIntensity ?? DEFAULT_INTENSITY;
        const restored = fallback ?? (persisted > 0 ? persisted : DEFAULT_INTENSITY);
        lastIntensityRef.current.delete(labelKey);
        return { ...filter, hardNo: false, maxIntensity: Math.min(10, Math.max(1, Math.round(restored))) };
      })
    );
  };

  const handleSaveFilter = (labelKey: string) => {
    const snapshot = cloneFilters(filterRows);
    const target = snapshot.find((filter) => filter.labelKey === labelKey);
    if (!target) return;
    const optimisticSignature = createFilterSignature(snapshot);
    const fallback = cloneFilters(persistedFilters);

    startTransition(async () => {
      console.log(`${DEBUG_PREFIX} attempting update`, {
        labelKey,
        maxIntensity: target.maxIntensity,
        hardNo: target.hardNo,
      });
      const result = await updateFilter({
        labelKey: target.labelKey,
        maxIntensity: target.maxIntensity,
        hardNo: target.hardNo,
      });

      console.log(`${DEBUG_PREFIX} update result`, { labelKey, result });

      if (!result.ok) {
        console.error(`${DEBUG_PREFIX} update failed`, { labelKey, error: result.error });
        setFilterRows(fallback);
        setPersistedFilters(fallback);
        setPendingSignature(null);
        setToast({ kind: "error", text: result.error ?? "Unable to save filter" });
      } else {
        setFilterRows(snapshot);
        setPersistedFilters(snapshot);
        setPendingSignature(optimisticSignature);
        setToast({ kind: "success", text: `${formatFilterLabel(labelKey)} saved` });
      }
    });
  };

  const toggleBulkMode = () => {
    setBulkMode((previous) => {
      if (previous) {
        setSelectedForRemoval([]);
      }
      return !previous;
    });
  };

  const toggleSelection = (labelKey: string, checked: boolean) => {
    setSelectedForRemoval((prev) => {
      if (checked) {
        if (prev.includes(labelKey)) return prev;
        return [...prev, labelKey];
      }
      return prev.filter((key) => key !== labelKey);
    });
  };

  const handleBulkRemove = () => {
    if (!selectedForRemoval.length) {
      setToast({ kind: "error", text: "Choose filters to remove" });
      return;
    }

    const snapshot = cloneFilters(filterRows);
    const remaining = snapshot.filter((filter) => !selectedForRemoval.includes(filter.labelKey));
    setFilterRows(remaining);
    const optimisticSignature = createFilterSignature(remaining);
    const fallback = snapshot;

    startTransition(async () => {
      const result = await removeFilters({ labels: selectedForRemoval });
      if (!result.ok) {
        setFilterRows(fallback);
        setPersistedFilters(fallback);
        setPendingSignature(null);
        setToast({ kind: "error", text: result.error ?? "Unable to remove filters" });
      } else {
        setPersistedFilters(remaining);
        setPendingSignature(optimisticSignature);
        setToast({ kind: "success", text: "Filters removed" });
      }
      setSelectedForRemoval([]);
      setBulkMode(false);
    });
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Reset filters to the default set?");
      if (!confirmed) return;
    }
    const snapshot = cloneFilters(filterRows);
    const defaults = DEFAULT_FILTERS.map((filter) => ({
      labelKey: filter.labelKey,
      maxIntensity: filter.defaultIntensity,
      hardNo: false,
    }));

    setFilterRows(defaults);
    setSelectedForRemoval([]);
    setBulkMode(false);
    const optimisticSignature = createFilterSignature(defaults);
    const fallback = snapshot;

    startTransition(async () => {
      const result = await resetFilters();
      if (!result.ok) {
        setFilterRows(fallback);
        setPersistedFilters(fallback);
        setPendingSignature(null);
        setToast({ kind: "error", text: result.error ?? "Unable to reset filters" });
      } else {
        setPersistedFilters(defaults);
        setPendingSignature(optimisticSignature);
        setToast({ kind: "success", text: "Filters reset to defaults" });
      }
    });
  };

  const handleAddFilters = () => {
    const parsed = parseInputList(addInput);
    if (!parsed.length) {
      setToast({ kind: "error", text: "Add at least one filter label" });
      return;
    }

    const snapshot = cloneFilters(filterRows);
    const existingKeys = new Set(snapshot.map((filter) => filter.labelKey.toLowerCase()));
    const unique = Array.from(new Map(parsed.map((label) => [label.toLowerCase(), label])).values());
    const newLabels = unique.filter((label) => !existingKeys.has(label.toLowerCase()));

    if (!newLabels.length) {
      setToast({ kind: "error", text: "Those filters already exist" });
      return;
    }

    const newRows = newLabels.map((label) => ({ labelKey: label, maxIntensity: DEFAULT_INTENSITY, hardNo: false }));
    const optimistic = [...snapshot, ...newRows];
    setFilterRows(optimistic);
    setAddInput("");
    const optimisticSignature = createFilterSignature(optimistic);

    startTransition(async () => {
      const result = await addFilters({ labels: newLabels });
      if (!result.ok) {
        setFilterRows(snapshot);
        setPersistedFilters(snapshot);
        setPendingSignature(null);
        setToast({ kind: "error", text: result.error ?? "Unable to add filters" });
      } else {
        setPersistedFilters(optimistic);
        setPendingSignature(optimisticSignature);
        setToast({ kind: "success", text: "Filters added" });
      }
    });
  };

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h1>{householdName ? `${householdName} · Preferences` : "Household preferences"}</h1>
        <p>
          Fine-tune what the agent recommends. Adjust intensity, toggle hard “no” topics, add new filters, or reset to the
          default set any time.
        </p>
      </div>
      <div className={styles.actionsRow}>
        <button type="button" className="secondary" onClick={toggleBulkMode} disabled={isPending}>
          {bulkMode ? "Cancel bulk remove" : "Bulk remove"}
        </button>
        <button type="button" className="secondary" onClick={handleReset} disabled={isPending}>
          Reset to defaults
        </button>
        <span className="badge">Intensity scale: None → No filter</span>
      </div>
      {bulkMode ? (
        <div className={styles.bulkBar}>
          <span>{selectedForRemoval.length} selected</span>
          <button type="button" onClick={handleBulkRemove} disabled={!selectedForRemoval.length || isPending}>
            Remove selected
          </button>
        </div>
      ) : null}
      <div className={styles.filtersGrid}>
        {formattedFilters.length ? (
          formattedFilters.map((filter) => {
            const isSelected = selectedForRemoval.includes(filter.labelKey);
            return (
              <div key={filter.labelKey} className={styles.filterCard}>
                <div className={styles.filterHeader}>
                  <span className={styles.filterTitle}>{filter.label}</span>
                  {bulkMode ? (
                    <label className={styles.bulkCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => toggleSelection(filter.labelKey, event.target.checked)}
                      />
                      Select
                    </label>
                  ) : null}
                </div>
                <div className={styles.rangeRow}>
                  <div className={styles.sliderRow}>
                    <label htmlFor={`intensity-${filter.labelKey}`} style={{ flex: 1 }}>
                      Intensity preference
                    </label>
                    <output htmlFor={`intensity-${filter.labelKey}`}>{describeIntensity(filter.maxIntensity)}</output>
                  </div>
                  <input
                    id={`intensity-${filter.labelKey}`}
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={filter.maxIntensity}
                    onChange={(event) => handleIntensityChange(filter.labelKey, Number(event.target.value))}
                    disabled={isPending || filter.hardNo}
                    aria-valuemin={0}
                    aria-valuemax={10}
                    aria-valuenow={filter.maxIntensity}
                    aria-valuetext={describeIntensity(filter.maxIntensity)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <input
                    id={`hardno-${filter.labelKey}`}
                    type="checkbox"
                    checked={filter.hardNo}
                    onChange={(event) => handleHardNoToggle(filter.labelKey, event.target.checked)}
                    disabled={isPending}
                  />
                  <label htmlFor={`hardno-${filter.labelKey}`}>Mark as a hard “no”</label>
                </div>
                <div className={styles.cardFooter}>
                  <span className="badge">Key: {filter.labelKey}</span>
                  <button type="button" onClick={() => handleSaveFilter(filter.labelKey)} disabled={isPending}>
                    Save changes
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            No filters yet. Use the add form below to define the themes and triggers your family cares about.
          </div>
        )}
      </div>
      <div className={styles.addForm}>
        <div>
          <label htmlFor="add-filters">Add multiple filters</label>
          <p className={styles.feedback} style={{ marginTop: "0.35rem" }}>
            Separate labels with commas or line breaks. New filters start with intensity {DEFAULT_INTENSITY} and hard “no” off.
          </p>
          <textarea
            id="add-filters"
            placeholder="e.g. jump_scares, live_action, dragons"
            value={addInput}
            onChange={(event) => setAddInput(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div>
          <span className={styles.feedback}>Popular defaults:</span>
          <div className={styles.inlineChips}>
            {DEFAULT_FILTERS.map((filter) => (
              <span key={filter.labelKey} className={styles.inlineChip}>
                {formatFilterLabel(filter.labelKey)}
              </span>
            ))}
          </div>
        </div>
        <button type="button" onClick={handleAddFilters} disabled={isPending}>
          Add filters
        </button>
      </div>
      <p className={styles.feedback}>Changes sync directly to Supabase. Adjustments will inform all future recommendations.</p>
      {toast ? (
        <div className={styles.toastContainer} aria-live="polite" role="status">
          <div className={`${styles.toast} ${toast.kind === "error" ? styles.toastError : styles.toastSuccess}`}>
            {toast.text}
          </div>
        </div>
      ) : null}
    </section>
  );
}
