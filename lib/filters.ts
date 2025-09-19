export type FilterDefinition = {
  labelKey: string;
  label: string;
  defaultIntensity: number;
};

export const DEFAULT_FILTERS: FilterDefinition[] = [
  { labelKey: "language", label: "Language", defaultIntensity: 5 },
  { labelKey: "mature_themes", label: "Mature Themes", defaultIntensity: 5 },
  { labelKey: "scary", label: "Scary", defaultIntensity: 5 },
  { labelKey: "sex_nudity", label: "Sex & Nudity", defaultIntensity: 4 },
  { labelKey: "substance", label: "Substance", defaultIntensity: 4 },
  { labelKey: "violence", label: "Violence", defaultIntensity: 5 },
];

export function formatFilterLabel(labelKey: string): string {
  const preset = DEFAULT_FILTERS.find((f) => f.labelKey === labelKey);
  if (preset) return preset.label;
  return labelKey
    .split(/[_\-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

