import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/types";

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-status-draft",
    text: "text-status-draft",
    bg: "bg-status-draft/10",
  },
  sent: {
    label: "Sent",
    dot: "bg-status-sent",
    text: "text-status-sent",
    bg: "bg-status-sent/10",
  },
  viewed: {
    label: "Viewed",
    dot: "bg-status-viewed",
    text: "text-status-viewed",
    bg: "bg-status-viewed/10",
  },
  signed: {
    label: "Signed",
    dot: "bg-status-signed",
    text: "text-status-signed",
    bg: "bg-status-signed/10",
  },
  declined: {
    label: "Declined",
    dot: "bg-status-declined",
    text: "text-status-declined",
    bg: "bg-status-declined/10",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
