"use client";

import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "./status-badge";
import { WorkflowJobs } from "./workflow-jobs";
import type { WorkflowRun, WorkflowRunJobSummary } from "@/lib/github";
import { isActiveWorkflowStatus } from "@/lib/workflow-status";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitBranch,
  GitCommit,
  MoreVertical,
  Play,
  RefreshCw,
  XCircle,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RunActionState {
  status: "pending" | "success" | "error";
  message: string;
}

interface WorkflowRunCardProps {
  run: WorkflowRun;
  org: string;
  viewMode: "cards" | "ops";
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRerun: () => Promise<void>;
  onRerunFailed: () => Promise<void>;
  onCancel: () => Promise<void>;
  actionState?: RunActionState;
  jobSummary?: WorkflowRunJobSummary;
  jobSummaryLoading: boolean;
  lastUpdated: Date | null;
}

export function WorkflowRunCard({
  run,
  org,
  viewMode,
  isExpanded,
  onToggleExpand,
  onRerun,
  onRerunFailed,
  onCancel,
  actionState,
  jobSummary,
  jobSummaryLoading,
  lastUpdated,
}: WorkflowRunCardProps) {
  const isRunning = isActiveWorkflowStatus(run.status);
  const isExecuting = run.status === "in_progress" || run.status === "pending";
  const hasFailed = run.conclusion === "failure";
  const isQueued = run.status === "queued" || run.status === "waiting";
  const isActionPending = actionState?.status === "pending";
  const summaryMetrics = buildSummaryMetrics(run, jobSummary, jobSummaryLoading, lastUpdated);

  const handleCancel = async () => {
    if (!window.confirm(`Cancel workflow run "${run.display_title}"?`)) {
      return;
    }

    await onCancel();
  };

  if (viewMode === "ops") {
    return (
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <Card
          className={cn(
            "gap-0 overflow-hidden rounded-lg border-l-4 shadow-sm transition-colors",
            hasFailed &&
              "border-red-300 border-l-red-500 bg-red-50/35 dark:border-red-900/70 dark:border-l-red-500 dark:bg-red-950/12",
            isExecuting &&
              !hasFailed &&
              "border-blue-300 border-l-blue-500 bg-blue-50/30 dark:border-blue-900/70 dark:border-l-blue-500 dark:bg-blue-950/12",
            isQueued &&
              !hasFailed &&
              !isExecuting &&
              "border-amber-300 border-l-amber-500 bg-amber-50/30 dark:border-amber-900/70 dark:border-l-amber-500 dark:bg-amber-950/12",
            !hasFailed &&
              !isExecuting &&
              !isQueued &&
              "border-slate-200 border-l-slate-300 dark:border-slate-800 dark:border-l-slate-700"
          )}
        >
          <div className="px-3 py-3">
            <div className="grid grid-cols-[auto_minmax(0,2.1fr)_minmax(220px,1.4fr)_auto_auto_auto] gap-3 items-center">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={run.status} conclusion={run.conclusion} />
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.16em]",
                      hasFailed && "text-red-700 dark:text-red-300",
                      isExecuting && !hasFailed && "text-blue-700 dark:text-blue-300",
                      isQueued && !hasFailed && "text-amber-700 dark:text-amber-300",
                      !hasFailed && !isExecuting && !isQueued && "text-muted-foreground"
                    )}
                  >
                    {hasFailed
                      ? "Needs attention"
                      : isExecuting
                        ? "Active"
                        : isQueued
                          ? "Waiting"
                          : "Stable"}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "truncate font-semibold",
                      hasFailed && "text-red-950 dark:text-red-100",
                      isExecuting && !hasFailed && "text-blue-950 dark:text-blue-100"
                    )}
                  >
                    {run.display_title}
                  </h3>
                  <Badge variant="outline" className={getEventBadgeColor(run.event)}>
                    {run.event.replace("_", " ")}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground/80">{run.repository.name}</span>
                  {run.head_branch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {run.head_branch}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <GitCommit className="h-3 w-3" />
                    <span className="font-mono">{run.head_sha.substring(0, 7)}</span>
                  </span>
                </div>
              </div>

              <div className="min-w-0 text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  {summaryMetrics.map((metric) => (
                    <MetricPill
                      key={metric.label}
                      label={metric.label}
                      tone={metric.tone}
                      compact
                    />
                  ))}
                </div>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                {run.actor && (
                  <div className="flex items-center justify-end gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={run.actor.avatar_url} />
                      <AvatarFallback>
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{run.actor.login}</span>
                  </div>
                )}
                <div>{formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}</div>
              </div>

              <div className="text-xs text-muted-foreground text-right">
                <div>#{run.run_number}</div>
                {run.run_attempt ? <div>Attempt {run.run_attempt}</div> : null}
              </div>

              <RunActionsMenu
                run={run}
                isRunning={isRunning}
                hasFailed={hasFailed}
                isActionPending={isActionPending}
                onRerun={onRerun}
                onRerunFailed={onRerunFailed}
                onCancel={handleCancel}
              />
            </div>

            {actionState && (
              <ActionStateBanner className="mt-3" actionState={actionState} />
            )}
          </div>

          <CollapsibleContent>
            <CardContent
              className={cn(
                "border-t pt-3",
                hasFailed && "bg-red-50/30 dark:bg-red-950/10",
                isExecuting && !hasFailed && "bg-blue-50/20 dark:bg-blue-950/10",
                isQueued && !hasFailed && "bg-amber-50/20 dark:bg-amber-950/10",
                !hasFailed && !isExecuting && !isQueued && "bg-muted/15"
              )}
            >
              <WorkflowJobs
                org={org}
                repo={run.repository.name}
                runId={run.id}
                runStatus={run.status}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-md",
          isRunning && "border-blue-300 dark:border-blue-700",
          hasFailed && "border-red-300 dark:border-red-700"
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base truncate max-w-md">
                    {run.display_title}
                  </h3>
                  <StatusBadge status={run.status} conclusion={run.conclusion} />
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          {run.repository.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{run.repository.full_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Badge variant="outline" className={getEventBadgeColor(run.event)}>
                    {run.event.replace("_", " ")}
                  </Badge>

                  {run.head_branch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{run.head_branch}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <GitCommit className="h-3 w-3" />
                    <span className="font-mono text-xs">{run.head_sha.substring(0, 7)}</span>
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {summaryMetrics.map((metric) => (
                    <MetricPill
                      key={metric.label}
                      label={metric.label}
                      tone={metric.tone}
                    />
                  ))}
                </div>

                {actionState && <ActionStateBanner className="mt-3" actionState={actionState} />}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {run.actor && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={run.actor.avatar_url} />
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Triggered by {run.actor.login}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <span className="text-xs">
                  {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                </span>
              </div>

              <RunActionsMenu
                run={run}
                isRunning={isRunning}
                hasFailed={hasFailed}
                isActionPending={isActionPending}
                onRerun={onRerun}
                onRerunFailed={onRerunFailed}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2">
            <WorkflowJobs
              org={org}
              repo={run.repository.name}
              runId={run.id}
              runStatus={run.status}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function RunActionsMenu({
  run,
  isRunning,
  hasFailed,
  isActionPending,
  onRerun,
  onRerunFailed,
  onCancel,
}: {
  run: WorkflowRun;
  isRunning: boolean;
  hasFailed: boolean;
  isActionPending: boolean;
  onRerun: () => Promise<void>;
  onRerunFailed: () => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isActionPending}>
          {isActionPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void onRerun()} disabled={isActionPending}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Re-run all jobs
        </DropdownMenuItem>
        {hasFailed && (
          <DropdownMenuItem onClick={() => void onRerunFailed()} disabled={isActionPending}>
            <Play className="mr-2 h-4 w-4" />
            Re-run failed jobs
          </DropdownMenuItem>
        )}
        {isRunning && (
          <DropdownMenuItem
            onClick={() => void onCancel()}
            disabled={isActionPending}
            className="text-destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel workflow
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href={run.html_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View on GitHub
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MetricPill({
  label,
  tone,
  compact = false,
}: {
  label: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        compact && "px-2 py-0.5",
        tone === "default" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
        tone === "success" && "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
      )}
    >
      {label}
    </span>
  );
}

function ActionStateBanner({
  actionState,
  className,
}: {
  actionState: RunActionState;
  className?: string;
}) {
  const isError = actionState.status === "error";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        isError
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
          : actionState.status === "pending"
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300"
            : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300",
        className
      )}
    >
      {actionState.status === "pending" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <span>{actionState.message}</span>
    </div>
  );
}

function buildSummaryMetrics(
  run: WorkflowRun,
  jobSummary: WorkflowRunJobSummary | undefined,
  jobSummaryLoading: boolean,
  lastUpdated: Date | null
) {
  const metrics: Array<{
    label: string;
    tone: "default" | "success" | "warning" | "danger" | "info";
  }> = [];

  if (jobSummaryLoading && !jobSummary) {
    metrics.push({
      label: "Loading job metrics",
      tone: "default",
    });
  }

  if (jobSummary) {
    metrics.push({
      label:
        jobSummary.total > 0
          ? `${jobSummary.succeeded}/${jobSummary.total} jobs passed`
          : "No jobs recorded",
      tone: jobSummary.failed > 0 ? "warning" : "success",
    });

    if (jobSummary.failed > 0) {
      metrics.push({
        label: `${jobSummary.failed} failed`,
        tone: "danger",
      });
    } else if (jobSummary.running > 0) {
      metrics.push({
        label: `${jobSummary.running} running`,
        tone: "info",
      });
    } else if (jobSummary.waiting > 0 || jobSummary.pending > 0 || jobSummary.queued > 0) {
      metrics.push({
        label: `${jobSummary.waiting + jobSummary.pending + jobSummary.queued} queued`,
        tone: "warning",
      });
    }
  }

  if (run.status === "queued" || run.status === "waiting") {
    metrics.push({
      label: `Queue age ${formatDistanceToNow(new Date(run.created_at))}`,
      tone: "warning",
    });
  } else {
    const duration = formatRunDuration(run.run_started_at ?? run.created_at, run.updated_at);
    if (duration) {
      metrics.push({
        label: `Duration ${duration}`,
        tone: "default",
      });
    }
  }

  if (lastUpdated) {
    metrics.push({
      label: `Synced ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`,
      tone: "default",
    });
  } else {
    metrics.push({
      label: `Updated ${formatDistanceToNow(new Date(run.updated_at), { addSuffix: true })}`,
      tone: "default",
    });
  }

  return metrics;
}

function formatRunDuration(start: string | null | undefined, end: string | null | undefined) {
  if (!start) return null;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const seconds = differenceInSeconds(endDate, startDate);

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function getEventBadgeColor(event: string) {
  switch (event) {
    case "push":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "pull_request":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "schedule":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "workflow_dispatch":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  }
}
