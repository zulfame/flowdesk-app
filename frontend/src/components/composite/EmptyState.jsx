import {
  AlertTriangle,
  FileText,
  Lock,
  SearchX,
  Sparkles,
  WifiOff,
} from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Classified empty-state composite (Registry 2C.18).
 * Variants: no-data · no-results · first-time · forbidden · offline · error.
 * Pass `action` (a Button/node) for retry/CTA where relevant.
 */
const VARIANTS = {
  "no-data": {
    icon: FileText,
    title: "No Data Available",
    description: "There's nothing here yet.",
  },
  "no-results": {
    icon: SearchX,
    title: "No results found",
    description: "No items match your search or filters.",
  },
  "first-time": {
    icon: Sparkles,
    title: "Get started",
    description: "Create your first item to get started.",
  },
  forbidden: {
    icon: Lock,
    title: "Access denied",
    description: "You don't have permission to view this content.",
  },
  offline: {
    icon: WifiOff,
    title: "You're offline",
    description: "Check your connection and try again.",
  },
  error: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "We couldn't load this content. Please try again.",
  },
};

export function EmptyState({
  variant = "no-data",
  title,
  description,
  action,
  className,
  testid,
}) {
  const preset = VARIANTS[variant] ?? VARIANTS["no-data"];
  const Icon = preset.icon;
  return (
    <Empty className={className} data-testid={testid ?? `empty-state-${variant}`}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title ?? preset.title}</EmptyTitle>
        <EmptyDescription>{description ?? preset.description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
