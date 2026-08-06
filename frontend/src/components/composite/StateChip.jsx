import { Badge } from "@/components/ui/badge";

/**
 * Coloured state badge (E9). Hue is passed as a CSS variable name so warna
 * tetap token-based, mis. `chip="--st-done"`.
 */
export function StateChip({ label, chip = "--st-draft", testid }) {
  return (
    <Badge
      variant="outline"
      className="state-chip font-medium"
      style={{ "--chip": `var(${chip})` }}
      data-testid={testid}
    >
      {label || "\u2014"}
    </Badge>
  );
}
