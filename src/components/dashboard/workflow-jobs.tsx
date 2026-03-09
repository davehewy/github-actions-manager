"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge } from "./status-badge";
import type { WorkflowJob } from "@/lib/github";
import {
  formatRateLimitMessage,
  isRateLimitActive,
  isRateLimitApiError,
  readApiError,
  type ApiErrorResponse,
  type RateLimitInfo,
} from "@/lib/api-error";
import {
  getDisplayedWorkflowJobState,
  isActiveWorkflowStatus,
} from "@/lib/workflow-status";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
  Loader2,
  AlertTriangle,
  Copy,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowJobsProps {
  org: string;
  repo: string;
  runId: number;
  runStatus: string | null;
}

function formatStepProgress(job: WorkflowJob) {
  const { summary } = getDisplayedWorkflowJobState(job);

  if (summary.total === 0) return null;

  const parts = [`${summary.completed}/${summary.total} steps`];

  if (summary.running > 0) {
    parts.push(`${summary.running} running`);
  } else if (summary.waiting > 0) {
    parts.push(`${summary.waiting} waiting`);
  } else if (summary.pending > 0) {
    parts.push(`${summary.pending} pending`);
  } else if (summary.queued > 0 && summary.completed < summary.total) {
    parts.push(`${summary.queued} queued`);
  }

  return parts.join(" • ");
}

function getJobSeverityScore(job: WorkflowJob) {
  const displayedState = getDisplayedWorkflowJobState(job);
  const summary = displayedState.summary;

  if (displayedState.conclusion === "failure") return 500 + summary.failed;
  if (displayedState.status === "in_progress") return 400 + summary.running;
  if (displayedState.status === "waiting") return 300 + summary.waiting;
  if (displayedState.status === "pending") return 250 + summary.pending;
  if (displayedState.status === "queued") return 200 + summary.queued;
  if (displayedState.conclusion === "cancelled") return 150;
  if (displayedState.conclusion === "success") return 50;
  return 0;
}

function getStepSeverityScore(step: NonNullable<WorkflowJob["steps"]>[number]) {
  if (step.conclusion === "failure") return 500;
  if (step.status === "in_progress") return 400;
  if (step.status === "waiting") return 300;
  if (step.status === "pending") return 250;
  if (step.status === "queued") return 200;
  if (step.conclusion === "cancelled") return 150;
  if (step.conclusion === "success") return 50;
  return 0;
}

export function WorkflowJobs({ org, repo, runId, runStatus }: WorkflowJobsProps) {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchJobs = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/github/jobs/${org}/${repo}/${runId}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const apiError = await readApiError(res);
        const error = new Error(apiError.error) as Error & { apiError?: ApiErrorResponse };
        error.apiError = apiError;
        throw error;
      }

      const data = await res.json();
      setJobs(data);
      setError(null);
      setRateLimitInfo(null);
      hasLoadedOnce.current = true;
    } catch (err) {
      const apiError =
        err instanceof Error && "apiError" in err
          ? ((err as Error & { apiError?: ApiErrorResponse }).apiError ?? null)
          : null;

      if (isRateLimitApiError(apiError)) {
        setRateLimitInfo(apiError?.rateLimit ?? null);
      }

      setError(
        isRateLimitApiError(apiError)
          ? formatRateLimitMessage(
              apiError?.rateLimit,
              "GitHub API rate limit reached while loading jobs."
            )
          : err instanceof Error
            ? err.message
            : "Unknown error"
      );
    } finally {
      if (!backgroundRefresh) {
        setLoading(false);
      }
    }
  }, [org, repo, runId]);

  useEffect(() => {
    hasLoadedOnce.current = false;
    setError(null);
    void fetchJobs(false);
  }, [fetchJobs]);

  useEffect(() => {
    if (!hasLoadedOnce.current || isRateLimitActive(rateLimitInfo)) return;
    void fetchJobs(true);
  }, [fetchJobs, rateLimitInfo, runStatus]);

  const hasActiveJobs = useMemo(
    () =>
      jobs.some((job) => {
        const { status } = getDisplayedWorkflowJobState(job);
        return isActiveWorkflowStatus(status);
      }),
    [jobs]
  );

  useEffect(() => {
    if ((!isActiveWorkflowStatus(runStatus) && !hasActiveJobs) || isRateLimitActive(rateLimitInfo)) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchJobs(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchJobs, hasActiveJobs, rateLimitInfo, runStatus]);

  useEffect(() => {
    if (rateLimitInfo && !isRateLimitActive(rateLimitInfo)) {
      setRateLimitInfo(null);
      return;
    }

    if (!isRateLimitActive(rateLimitInfo)) return;

    const delay =
      rateLimitInfo?.resetAt
        ? Math.max(0, new Date(rateLimitInfo.resetAt).getTime() - Date.now())
        : Math.max(0, (rateLimitInfo?.retryAfterSeconds ?? 0) * 1000);

    if (!delay) return;

    const timeout = window.setTimeout(() => {
      setRateLimitInfo(null);
      void fetchJobs(true);
    }, delay + 1000);

    return () => window.clearTimeout(timeout);
  }, [fetchJobs, rateLimitInfo]);

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((left, right) => {
        return (
          getJobSeverityScore(right) - getJobSeverityScore(left) ||
          left.name.localeCompare(right.name)
        );
      }),
    [jobs]
  );

  const toggleJob = (jobId: number) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const formatDuration = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return "-";
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
  };

  if (loading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm py-2">
        Error loading jobs: {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-2">
        No jobs found for this workflow run.
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      {sortedJobs.map((job) => {
        const displayedState = getDisplayedWorkflowJobState(job);
        const progressLabel = formatStepProgress(job);
        const sortedSteps = [...(job.steps ?? [])].sort((left, right) => {
          return getStepSeverityScore(right) - getStepSeverityScore(left) || left.number - right.number;
        });

        return (
          <Collapsible
            key={job.id}
            open={expandedJobs.has(job.id)}
            onOpenChange={() => toggleJob(job.id)}
          >
            <div
              className={cn(
                "rounded-lg border bg-muted/30 transition-colors",
                displayedState.status === "in_progress" &&
                  "border-blue-200 dark:border-blue-800",
                displayedState.conclusion === "failure" &&
                  "border-red-200 dark:border-red-800"
              )}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedJobs.has(job.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium truncate">{job.name}</span>
                      <StatusBadge
                        status={displayedState.status}
                        conclusion={displayedState.conclusion}
                      />
                    </div>
                    {progressLabel && (
                      <div className="ml-6 mt-1 text-xs text-muted-foreground">
                        {progressLabel}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(job.started_at, job.completed_at)}
                    </span>
                    <LogViewer org={org} repo={repo} jobId={job.id} jobName={job.name} />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {sortedSteps.length > 0 && (
                  <div className="px-3 pb-3">
                    <div className="space-y-1 ml-6">
                      {sortedSteps.map((step) => (
                        <div
                          key={step.number}
                          className={cn(
                            "flex items-center justify-between py-1 px-2 rounded text-sm",
                            step.conclusion === "failure" && "bg-red-50 dark:bg-red-950/30",
                            step.conclusion === "success" && "bg-green-50/50 dark:bg-green-950/20"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-4">
                              {step.number}
                            </span>
                            <span className={cn(
                              step.conclusion === "failure" && "text-red-700 dark:text-red-400"
                            )}>
                              {step.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={step.status}
                              conclusion={step.conclusion}
                              className="text-xs py-0 px-1.5"
                            />
                            {step.started_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(step.started_at, step.completed_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

interface LogViewerProps {
  org: string;
  repo: string;
  jobId: number;
  jobName: string;
}

// Patterns that indicate error lines
const ERROR_PATTERNS = [
  /error[:.\s]/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\bexception\b/i,
  /\bfatal\b/i,
  /\bpanic\b/i,
  /\bcannot\b/i,
  /\bunable to\b/i,
  /\bnot found\b/i,
  /\bdenied\b/i,
  /\btimeout\b/i,
  /\brejected\b/i,
  /^\s*at\s+.*\(.*:\d+:\d+\)/, // Stack trace lines
  /^\s+at\s+/, // More stack traces
  /Traceback.*:/i,
  /^E\s+/, // Pytest errors
  /FAILED/,
  /ERROR/,
  /npm ERR!/,
  /yarn error/i,
  /ModuleNotFoundError/,
  /ImportError/,
  /SyntaxError/,
  /TypeError/,
  /ReferenceError/,
  /AssertionError/,
];

interface ParsedLine {
  number: number;
  content: string;
  isError: boolean;
}

function parseLogLines(logs: string): ParsedLine[] {
  const lines = logs.split('\n');
  return lines.map((content, index) => ({
    number: index + 1,
    content,
    isError: ERROR_PATTERNS.some(pattern => pattern.test(content)),
  }));
}

function LogViewer({ org, repo, jobId, jobName }: LogViewerProps) {
  const [logs, setLogs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    if (logs) return; // Already fetched

    setLoading(true);
    try {
      const res = await fetch(`/api/github/logs/${org}/${repo}/${jobId}`);
      if (!res.ok) {
        const apiError = await readApiError(res);
        throw new Error(
          isRateLimitApiError(apiError)
            ? formatRateLimitMessage(
                apiError.rateLimit,
                "GitHub API rate limit reached while loading logs."
              )
            : apiError.error
        );
      }
      const data = await res.json();
      setLogs(data.logs);
    } catch (err) {
      setLogs(`Error loading logs: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchLogs();
    }
  };

  const parsedLines = logs ? parseLogLines(logs) : [];
  const errorLines = parsedLines.filter(line => line.isError);
  const displayLines = showErrorsOnly ? errorLines : parsedLines;

  const copyErrorsToClipboard = async () => {
    const errorText = errorLines
      .map(line => `L${line.number}: ${line.content}`)
      .join('\n');

    const header = `Error lines from ${jobName}:\n${'─'.repeat(50)}\n`;
    const fullText = header + (errorText || 'No errors detected');

    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAllLogs = async () => {
    await navigator.clipboard.writeText(logs || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <FileText className="h-4 w-4 mr-1" />
          Logs
        </Button>
      </DialogTrigger>
      <DialogContent
        className="!max-w-[95vw] !w-[1400px] h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs: {jobName}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        {!loading && logs && (
          <div className="flex items-center justify-between gap-2 py-2 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant={showErrorsOnly ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowErrorsOnly(!showErrorsOnly);
                }}
                className="h-8"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {showErrorsOnly ? "Showing Errors" : "Show Errors Only"}
                {errorLines.length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {errorLines.length}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyErrorsToClipboard();
                }}
                disabled={errorLines.length === 0}
                className="h-8"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                Copy Errors
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyAllLogs();
                }}
                className="h-8"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy All
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 w-full rounded-md border bg-zinc-950 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs ? (
            <div className="font-mono text-xs">
              {displayLines.map((line) => (
                <div
                  key={line.number}
                  className={cn(
                    "flex hover:bg-zinc-800/50 group",
                    line.isError && "bg-red-950/40 hover:bg-red-950/60"
                  )}
                >
                  <span
                    className={cn(
                      "select-none px-3 py-0.5 text-right min-w-[4rem] border-r border-zinc-800",
                      line.isError ? "text-red-400 bg-red-950/30" : "text-zinc-600"
                    )}
                  >
                    {line.number}
                  </span>
                  <pre
                    className={cn(
                      "flex-1 px-3 py-0.5 whitespace-pre-wrap break-all cursor-text",
                      line.isError ? "text-red-300" : "text-green-400"
                    )}
                  >
                    {line.content || " "}
                  </pre>
                  {line.isError && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`L${line.number}: ${line.content}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 text-zinc-500 hover:text-zinc-300 transition-opacity"
                      title="Copy line"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-zinc-500">No logs available</div>
          )}
        </ScrollArea>

        {/* Error summary */}
        {!loading && logs && errorLines.length > 0 && (
          <div className="pt-2 border-t flex-shrink-0">
            <p className="text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 inline mr-1 text-red-500" />
              {errorLines.length} error line{errorLines.length !== 1 ? 's' : ''} detected
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
