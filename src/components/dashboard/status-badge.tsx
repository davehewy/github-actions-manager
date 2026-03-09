"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  AlertCircle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null;
  conclusion: string | null;
  className?: string;
}

export function StatusBadge({ status, conclusion, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (status === "queued") {
      return {
        label: "Queued",
        icon: Clock,
        variant: "secondary" as const,
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      };
    }

    if (status === "in_progress" || status === "waiting") {
      return {
        label: status === "waiting" ? "Waiting" : "Running",
        icon: Loader2,
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        animate: true,
      };
    }

    if (status === "pending") {
      return {
        label: "Pending",
        icon: Timer,
        variant: "secondary" as const,
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      };
    }

    // Completed - check conclusion
    switch (conclusion) {
      case "success":
        return {
          label: "Success",
          icon: CheckCircle2,
          variant: "secondary" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
      case "failure":
        return {
          label: "Failed",
          icon: XCircle,
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: Ban,
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
        };
      case "skipped":
        return {
          label: "Skipped",
          icon: AlertCircle,
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
        };
      case "timed_out":
        return {
          label: "Timed Out",
          icon: Clock,
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
      case "action_required":
        return {
          label: "Action Required",
          icon: AlertCircle,
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
      default:
        return {
          label: status || "Unknown",
          icon: AlertCircle,
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      <Icon
        className={cn(
          "mr-1 h-3 w-3",
          "animate" in config && config.animate && "animate-spin"
        )}
      />
      {config.label}
    </Badge>
  );
}
