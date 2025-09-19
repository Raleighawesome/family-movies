"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

function cloneFilters(list: FilterView[]): FilterView[] {
  return list.map((item) => ({ ...item }));
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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFilterRows(filters);
    setPersistedFilters(filters);
    setSelectedForRemoval([]);
  }, [filters]);

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
          ? { ...filter, maxIntensity: Math.min(10, Math.max(1, Math.round(value))) }
          : filter
      )
    );
  };

  const handleHardNoToggle = (labelKey: string, checked: boolean) => {
    setFilterRows((prev) => prev.map((filter) => (filter.labelKey === labelKey ? { ...filter, hardNo: checked } : filter)));
  };

  const handleSaveFilter = (labelKey: string) => {
    const snapshot = cloneFilters(filterRows);
    const target = snapshot.find((filter) => filter.labelKey === labelKey);
    if (!target) return;

    startTransition(async () => {
      const result = await updateFilter({
        labelKey: target.labelKey,
        maxIntensity: target.maxIntensity,
        hardNo: target.hardNo,
      });

      if (!result.ok) {
        setFilterRows(cloneFilters(persistedFilters));
        setToast({ kind: "error", text: result.error ?? "Unable to save filter" });
      } else {
        setPersistedFilters(snapshot);
        setToast({ kind: "success", text: "Filter updated" });
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

    startTransition(async () => {
      const result = await removeFilters({ labels: selectedForRemoval });
      if (!result.ok) {
        setFilterRows(snapshot);
        setToast({ kind: "error", text: result.error ?? "Unable to remove filters" });
      } else {
        setPersistedFilters(remaining);
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

    startTransition(async () => {
      const result = await resetFilters();
      if (!result.ok) {
        setFilterRows(snapshot);
        setToast({ kind: "error", text: result.error ?? "Unable to reset filters" });
      } else {
        setPersistedFilters(defaults);
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

    startTransition(async () => {
      const result = await addFilters({ labels: newLabels });
      if (!result.ok) {
        setFilterRows(snapshot);
        setToast({ kind: "error", text: result.error ?? "Unable to add filters" });
      } else {
        setPersistedFilters(optimistic);
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
        <span className="badge">Intensity: 1 (low) – 10 (high)</span>
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
                    <output htmlFor={`intensity-${filter.labelKey}`}>{filter.maxIntensity}</output>
                  </div>
                  <input
                    id={`intensity-${filter.labelKey}`}
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={filter.maxIntensity}
                    onChange={(event) => handleIntensityChange(filter.labelKey, Number(event.target.value))}
                    disabled={isPending}
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
      {toast ? (
        <p className={`${styles.feedback} ${toast.kind === "error" ? styles.feedbackError : styles.feedbackSuccess}`}>
          {toast.text}
        </p>
      ) : (
        <p className={styles.feedback}>Changes sync directly to Supabase. Adjustments will inform all future recommendations.</p>
      )}
    </section>
  );
}
