import { StateChip } from "@/components/composite/StateChip";

/** Jenis rapat → hue token (E9). */
export const MEETING_TYPE_META = {
  Internal: { label: "Internal", chip: "--mt-internal" },
  Eksternal: { label: "Eksternal", chip: "--mt-eksternal" },
  Online: { label: "Online", chip: "--mt-online" },
  Klien: { label: "Klien", chip: "--mt-klien" },
  Review: { label: "Review", chip: "--mt-review" },
};

export const MEETING_TYPES = Object.keys(MEETING_TYPE_META);

export function MeetingTypeBadge({ type }) {
  const meta = MEETING_TYPE_META[type] || { label: type, chip: "--st-draft" };
  return <StateChip label={meta.label} chip={meta.chip} testid="meeting-type-badge" />;
}
