"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrgSelector } from "./org-selector";
import { WorkflowRunCard, type RunActionState } from "./workflow-run-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  WorkflowRun,
  WorkflowRunJobSummary,
  WorkflowRunJobSummariesResponse,
  WorkflowRunsMeta,
  WorkflowRunsResponse,
} from "@/lib/github";
import {
  formatRateLimitMessage,
  isRateLimitActive,
  isRateLimitApiError,
  readApiError,
  type ApiErrorResponse,
  type RateLimitInfo,
} from "@/lib/api-error";
import { isActiveWorkflowStatus } from "@/lib/workflow-status";
import {
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Rows3,
  ServerCrash,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "running" | "success" | "failure" | "queued";
type ViewMode = "cards" | "ops";
type SortMode = "priority" | "newest" | "oldest" | "duration" | "queue-age" | "repo";
type GroupMode = "none" | "repo" | "workflow" | "branch" | "status";

interface WorkflowRunSummaryEntry {
  fetchedAt: string;
  sourceUpdatedAt: string;
  summary: WorkflowRunJobSummary;
}

interface WorkflowRunsPayload {
  runs: WorkflowRun[];
  meta: WorkflowRunsMeta | null;
}

interface RunGroup {
  key: string;
  label: string;
  runs: WorkflowRun[];
  score: number;
  failedCount: number;
  activeCount: number;
  queuedCount: number;
}

export function WorkflowDashboard() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());
  const [loadMeta, setLoadMeta] = useState<WorkflowRunsMeta | null>(null);
  const [runActionStates, setRunActionStates] = useState<Record<number, RunActionState>>({});
  const [runSummaryEntries, setRunSummaryEntries] = useState<
    Record<number, WorkflowRunSummaryEntry>
  >({});
  const [summaryLoading, setSummaryLoading] = useState<Record<number, boolean>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchRuns = useCallback(async (isBackgroundRefresh = false) => {
    if (!selectedOrg) return;

    if (!isBackgroundRefresh && !hasLoadedOnce.current) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    if (!isBackgroundRefresh) {
      setError(null);
    }

    try {
      const res = await fetch(`/api/github/runs/${selectedOrg}`, { cache: "no-store" });
      if (!res.ok) {
        const apiError = await readApiError(res);
        const error = new Error(apiError.error) as Error & { apiError?: ApiErrorResponse };
        error.apiError = apiError;
        throw error;
      }

      const payload = (await res.json()) as WorkflowRunsResponse | WorkflowRun[];
      const normalized = normalizeRunsPayload(payload);

      setRuns(normalized.runs);
      setLoadMeta(normalized.meta);
      setLastUpdated(new Date(normalized.meta?.fetchedAt ?? Date.now()));
      setError(null);
      setStaleWarning(null);
      setRateLimitInfo(normalized.meta?.rateLimit ?? null);
      if (normalized.meta?.rateLimit?.limited) {
        setAutoRefresh(false);
      }
      hasLoadedOnce.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const apiError =
        err instanceof Error && "apiError" in err
          ? ((err as Error & { apiError?: ApiErrorResponse }).apiError ?? null)
          : null;

      if (isRateLimitApiError(apiError)) {
        setRateLimitInfo(apiError?.rateLimit ?? null);
        setAutoRefresh(false);
      }

      const displayMessage = isRateLimitApiError(apiError)
        ? formatRateLimitMessage(
            apiError?.rateLimit,
            "GitHub API rate limit reached. Live refresh paused."
          )
        : message;

      if (isBackgroundRefresh && hasLoadedOnce.current) {
        setStaleWarning(displayMessage);
      } else {
        setError(displayMessage);
      }
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOrg]);

  const toggleRunExpanded = useCallback((runId: number) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;

    hasLoadedOnce.current = false;
    setRuns([]);
    setExpandedRuns(new Set());
    setLoadMeta(null);
    setLastUpdated(null);
    setError(null);
    setStaleWarning(null);
    setRunActionStates({});
    setRunSummaryEntries({});
    setSummaryLoading({});
    setRateLimitInfo(null);
    void fetchRuns(false);
  }, [selectedOrg, fetchRuns]);

  useEffect(() => {
    if (!autoRefresh || !selectedOrg || isRateLimitActive(rateLimitInfo)) return;

    const interval = window.setInterval(() => {
      void fetchRuns(true);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchRuns, rateLimitInfo, selectedOrg]);

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
      setRateLimitInfo((current) => (current && isRateLimitActive(current) ? current : null));
    }, delay + 1000);

    return () => window.clearTimeout(timeout);
  }, [rateLimitInfo]);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      switch (filter) {
        case "running":
          return run.status === "in_progress";
        case "success":
          return run.conclusion === "success";
        case "failure":
          return run.conclusion === "failure";
        case "queued":
          return run.status === "queued" || run.status === "waiting";
        default:
          return true;
      }
    });
  }, [filter, runs]);

  const sortedRuns = useMemo(() => {
    const sorted = [...filteredRuns];

    sorted.sort((left, right) => {
      const leftSummary = runSummaryEntries[left.id]?.summary;
      const rightSummary = runSummaryEntries[right.id]?.summary;

      switch (sortMode) {
        case "newest":
          return getRunCreatedAt(right) - getRunCreatedAt(left);
        case "oldest":
          return getRunCreatedAt(left) - getRunCreatedAt(right);
        case "duration":
          return getRunDurationMs(right) - getRunDurationMs(left);
        case "queue-age":
          return getRunQueueAgeMs(right) - getRunQueueAgeMs(left);
        case "repo":
          return (
            left.repository.name.localeCompare(right.repository.name) ||
            getRunCreatedAt(right) - getRunCreatedAt(left)
          );
        case "priority":
        default:
          return (
            getRunPriorityScore(right, rightSummary) - getRunPriorityScore(left, leftSummary) ||
            getRunCreatedAt(right) - getRunCreatedAt(left)
          );
      }
    });

    return sorted;
  }, [filteredRuns, runSummaryEntries, sortMode]);

  const groupedRuns = useMemo(() => {
    if (groupMode === "none") {
      return [
        {
          key: "all",
          label: "All runs",
          runs: sortedRuns,
          score: 0,
          failedCount: 0,
          activeCount: 0,
          queuedCount: 0,
        },
      ];
    }

    const groups = new Map<string, RunGroup>();

    for (const run of sortedRuns) {
      const { key, label } = getRunGroup(run, groupMode);
      const existing = groups.get(key);

      if (existing) {
        existing.runs.push(run);
        existing.score += getRunPriorityScore(run, runSummaryEntries[run.id]?.summary);
        if (run.conclusion === "failure") existing.failedCount += 1;
        if (run.status === "queued" || run.status === "waiting") existing.queuedCount += 1;
        if (isActiveWorkflowStatus(run.status)) existing.activeCount += 1;
      } else {
        groups.set(key, {
          key,
          label,
          runs: [run],
          score: getRunPriorityScore(run, runSummaryEntries[run.id]?.summary),
          failedCount: run.conclusion === "failure" ? 1 : 0,
          activeCount: isActiveWorkflowStatus(run.status) ? 1 : 0,
          queuedCount: run.status === "queued" || run.status === "waiting" ? 1 : 0,
        });
      }
    }

    return [...groups.values()].sort(
      (left, right) => right.score - left.score || left.label.localeCompare(right.label)
    );
  }, [groupMode, runSummaryEntries, sortedRuns]);

  const summaryTargets = useMemo(() => {
    const candidates = new Map<number, WorkflowRun>();

    for (const run of sortedRuns) {
      if (
        expandedRuns.has(run.id) ||
        isActiveWorkflowStatus(run.status) ||
        run.conclusion === "failure"
      ) {
        candidates.set(run.id, run);
      }
    }

    for (const run of sortedRuns.slice(0, 20)) {
      candidates.set(run.id, run);
    }

    return [...candidates.values()];
  }, [expandedRuns, sortedRuns]);

  useEffect(() => {
    if (!selectedOrg || summaryTargets.length === 0 || isRateLimitActive(rateLimitInfo)) return;

    const runsToFetch = summaryTargets.filter((run) => {
      const entry = runSummaryEntries[run.id];
      return !entry || entry.sourceUpdatedAt !== run.updated_at;
    });

    if (runsToFetch.length === 0) return;

    let cancelled = false;

    setSummaryLoading((prev) => {
      const next = { ...prev };
      for (const run of runsToFetch) {
        next[run.id] = true;
      }
      return next;
    });

    async function fetchRunSummaries() {
      try {
        const res = await fetch(`/api/github/runs/${selectedOrg}/summaries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            runs: runsToFetch.map((run) => ({
              repo: run.repository.name,
              runId: run.id,
            })),
          }),
        });

        if (!res.ok) {
          const apiError = await readApiError(res);

          if (isRateLimitApiError(apiError)) {
            setRateLimitInfo(apiError.rateLimit ?? null);
            setAutoRefresh(false);
          }

          throw new Error(
            isRateLimitApiError(apiError)
              ? formatRateLimitMessage(
                  apiError.rateLimit,
                  "GitHub API rate limit reached while loading run summaries."
                )
              : apiError.error
          );
        }

        const data = (await res.json()) as WorkflowRunJobSummariesResponse;

        if (cancelled) return;

        setRunSummaryEntries((prev) => {
          const next = { ...prev };

          for (const run of runsToFetch) {
            const summary = data.summaries[run.id];
            if (!summary) continue;

            next[run.id] = {
              summary,
              fetchedAt: data.meta.fetchedAt,
              sourceUpdatedAt: run.updated_at,
            };
          }

          return next;
        });
      } catch (summaryError) {
        console.error("Failed to load run summaries:", summaryError);
      } finally {
        if (cancelled) return;

        setSummaryLoading((prev) => {
          const next = { ...prev };
          for (const run of runsToFetch) {
            delete next[run.id];
          }
          return next;
        });
      }
    }

    void fetchRunSummaries();

    return () => {
      cancelled = true;
    };
  }, [rateLimitInfo, runSummaryEntries, selectedOrg, summaryTargets]);

  const setRunActionState = useCallback((runId: number, nextState: RunActionState) => {
    setRunActionStates((prev) => ({
      ...prev,
      [runId]: nextState,
    }));
  }, []);

  const clearRunActionState = useCallback((runId: number) => {
    window.setTimeout(() => {
      setRunActionStates((prev) => {
        if (!prev[runId] || prev[runId].status === "pending") {
          return prev;
        }

        const next = { ...prev };
        delete next[runId];
        return next;
      });
    }, 4000);
  }, []);

  const runAction = useCallback(async (
    run: WorkflowRun,
    action: "rerun" | "rerun-failed" | "cancel",
    message: string
  ) => {
    if (!selectedOrg) return;

    setRunActionState(run.id, {
      status: "pending",
      message,
    });

    try {
      const res = await fetch(
        `/api/github/runs/${selectedOrg}/${run.repository.name}/${run.id}/${action}`,
        { method: "POST" }
      );

      const payload = res.ok ? await res.json().catch(() => null) : await readApiError(res);

      if (!res.ok) {
        if (isRateLimitApiError(payload)) {
          setRateLimitInfo(payload.rateLimit ?? null);
          setAutoRefresh(false);
        }

        throw new Error(
          isRateLimitApiError(payload)
            ? formatRateLimitMessage(
                payload.rateLimit,
                "GitHub API rate limit reached. Action requests paused."
              )
            : payload?.error || "Action failed"
        );
      }

      setRunActionState(run.id, {
        status: "success",
        message:
          action === "cancel"
            ? "Cancel request sent to GitHub."
            : action === "rerun-failed"
              ? "Retry for failed jobs requested."
              : "Rerun requested.",
      });

      clearRunActionState(run.id);
      window.setTimeout(() => {
        void fetchRuns(true);
      }, 1200);
    } catch (err) {
      setRunActionState(run.id, {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
      clearRunActionState(run.id);
    }
  }, [clearRunActionState, fetchRuns, selectedOrg, setRunActionState]);

  const stats = useMemo(() => ({
    total: runs.length,
    running: runs.filter((r) => r.status === "in_progress").length,
    queued: runs.filter((r) => r.status === "queued" || r.status === "waiting").length,
    success: runs.filter((r) => r.conclusion === "success").length,
    failure: runs.filter((r) => r.conclusion === "failure").length,
  }), [runs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <OrgSelector selectedOrg={selectedOrg} onSelect={setSelectedOrg} />

        <div className="flex flex-wrap items-center gap-2">
          {isRefreshing && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 rounded-md border px-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating live data
            </span>
          )}

          <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === "ops" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("ops")}
              className="h-8"
            >
              <Rows3 className="h-4 w-4" />
              Ops view
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              autoRefresh &&
                "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
            )}
          >
            <Activity className={cn("h-4 w-4 mr-1", autoRefresh && "text-green-600")} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchRuns(false)}
            disabled={initialLoading || isRefreshing || !selectedOrg}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 mr-1",
                (initialLoading || isRefreshing) && "animate-spin"
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      {selectedOrg && runs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Total"
            value={stats.total}
            icon={Activity}
            className="bg-slate-50 dark:bg-slate-900/50"
          />
          <StatCard
            label="Running"
            value={stats.running}
            icon={Loader2}
            iconClassName={stats.running > 0 ? "animate-spin text-blue-500" : ""}
            className={cn(
              stats.running > 0 &&
                "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
            )}
          />
          <StatCard
            label="Queued"
            value={stats.queued}
            icon={Clock}
            className={cn(
              stats.queued > 0 &&
                "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            )}
          />
          <StatCard
            label="Success"
            value={stats.success}
            icon={CheckCircle2}
            iconClassName="text-green-500"
            className="bg-green-50 dark:bg-green-950/30"
          />
          <StatCard
            label="Failed"
            value={stats.failure}
            icon={XCircle}
            iconClassName="text-red-500"
            className={cn(
              stats.failure > 0 &&
                "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            )}
          />
        </div>
      )}

      {selectedOrg && runs.length > 0 && (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterStatus)}>
              <TabsList>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="running">Running ({stats.running})</TabsTrigger>
                <TabsTrigger value="queued">Queued ({stats.queued})</TabsTrigger>
                <TabsTrigger value="success">Success ({stats.success})</TabsTrigger>
                <TabsTrigger value="failure">Failed ({stats.failure})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort runs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority first</SelectItem>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="duration">Longest duration</SelectItem>
                  <SelectItem value="queue-age">Oldest queue age</SelectItem>
                  <SelectItem value="repo">Repository A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupMode} onValueChange={(value) => setGroupMode(value as GroupMode)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Group runs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="repo">By repository</SelectItem>
                  <SelectItem value="workflow">By workflow</SelectItem>
                  <SelectItem value="branch">By branch</SelectItem>
                  <SelectItem value="status">By status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {lastUpdated && (
            <div className="text-xs text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2">
              Synced {lastUpdated.toLocaleTimeString()}
              {autoRefresh && " • polling every 30s"}
            </div>
          )}
        </div>
      )}

      {staleWarning && runs.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Live refresh failed</AlertTitle>
          <AlertDescription>
            Showing the last successful snapshot. {staleWarning}
          </AlertDescription>
        </Alert>
      )}

      {rateLimitInfo && (
        <Alert className="border-yellow-200 bg-yellow-50/90 text-yellow-950 dark:border-yellow-900/60 dark:bg-yellow-950/20 dark:text-yellow-200">
          <Clock className="h-4 w-4" />
          <AlertTitle>GitHub rate limit reached</AlertTitle>
          <AlertDescription>
            {formatRateLimitMessage(
              rateLimitInfo,
              "Live refresh is paused because GitHub throttled this session."
            )}
            <p>Manual refresh remains available if you want to test before the reset time.</p>
          </AlertDescription>
        </Alert>
      )}

      {loadMeta && loadMeta.failedRepositories > 0 && (
        <Alert className="border-orange-200 bg-orange-50/80 text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-200">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Partial repository coverage</AlertTitle>
          <AlertDescription>
            Loaded {loadMeta.loadedRepositories} of {loadMeta.totalRepositories} repositories.
            {loadMeta.failedRepositoryNames.length > 0 && (
              <p>
                Failed to read: {loadMeta.failedRepositoryNames.slice(0, 5).join(", ")}
                {loadMeta.failedRepositoryNames.length > 5 &&
                  ` +${loadMeta.failedRepositoryNames.length - 5} more`}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Workflow data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {initialLoading && runs.length === 0 && (
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      )}

      {selectedOrg && !initialLoading && runs.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No workflow runs found</p>
          <p className="text-sm">
            This organization doesn&apos;t have any recent workflow runs.
          </p>
        </div>
      )}

      {sortedRuns.length > 0 && (
        viewMode === "ops" ? (
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[1080px] space-y-2">
              <div className="grid grid-cols-[auto_minmax(0,2.1fr)_minmax(220px,1.4fr)_auto_auto_auto] gap-3 rounded-lg border border-border/60 bg-background/95 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-sm">
                <span>Status</span>
                <span>Run</span>
                <span>Signals</span>
                <span className="text-right">Actor</span>
                <span className="text-right">Attempt</span>
                <span className="text-right">Actions</span>
              </div>
              {groupedRuns.map((group) => (
                <div key={group.key} className="space-y-2">
                  {groupMode !== "none" && (
                    <GroupHeader
                      label={group.label}
                      count={group.runs.length}
                      failedCount={group.failedCount}
                      activeCount={group.activeCount}
                      queuedCount={group.queuedCount}
                    />
                  )}
                  {group.runs.map((run) => (
                    <WorkflowRunCard
                      key={run.id}
                      run={run}
                      org={selectedOrg!}
                      viewMode={viewMode}
                      isExpanded={expandedRuns.has(run.id)}
                      onToggleExpand={() => toggleRunExpanded(run.id)}
                      onRerun={() => runAction(run, "rerun", "Requesting rerun...")}
                      onRerunFailed={() =>
                        runAction(run, "rerun-failed", "Requesting retry for failed jobs...")
                      }
                      onCancel={() => runAction(run, "cancel", "Sending cancel request...")}
                      actionState={runActionStates[run.id]}
                      jobSummary={runSummaryEntries[run.id]?.summary}
                      jobSummaryLoading={summaryLoading[run.id] ?? false}
                      lastUpdated={lastUpdated}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedRuns.map((group) => (
              <div key={group.key} className="space-y-3">
                {groupMode !== "none" && (
                  <GroupHeader
                    label={group.label}
                    count={group.runs.length}
                    failedCount={group.failedCount}
                    activeCount={group.activeCount}
                    queuedCount={group.queuedCount}
                  />
                )}
                {group.runs.map((run) => (
                  <WorkflowRunCard
                    key={run.id}
                    run={run}
                    org={selectedOrg!}
                    viewMode={viewMode}
                    isExpanded={expandedRuns.has(run.id)}
                    onToggleExpand={() => toggleRunExpanded(run.id)}
                    onRerun={() => runAction(run, "rerun", "Requesting rerun...")}
                    onRerunFailed={() =>
                      runAction(run, "rerun-failed", "Requesting retry for failed jobs...")
                    }
                    onCancel={() => runAction(run, "cancel", "Sending cancel request...")}
                    actionState={runActionStates[run.id]}
                    jobSummary={runSummaryEntries[run.id]?.summary}
                    jobSummaryLoading={summaryLoading[run.id] ?? false}
                    lastUpdated={lastUpdated}
                  />
                ))}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function normalizeRunsPayload(payload: WorkflowRunsResponse | WorkflowRun[]): WorkflowRunsPayload {
  if (Array.isArray(payload)) {
    return {
      runs: payload,
      meta: null,
    };
  }

  return {
    runs: payload.runs,
    meta: payload.meta,
  };
}

function getRunCreatedAt(run: WorkflowRun) {
  return new Date(run.created_at).getTime();
}

function getRunDurationMs(run: WorkflowRun) {
  const start = run.run_started_at ?? run.created_at;
  const end = isActiveWorkflowStatus(run.status) ? Date.now() : new Date(run.updated_at).getTime();
  return Math.max(0, end - new Date(start).getTime());
}

function getRunQueueAgeMs(run: WorkflowRun) {
  if (run.status !== "queued" && run.status !== "waiting") {
    return 0;
  }

  return Math.max(0, Date.now() - new Date(run.created_at).getTime());
}

function getRunPriorityScore(run: WorkflowRun, summary?: WorkflowRunJobSummary) {
  let score = 0;

  if (run.conclusion === "failure") score += 1000;
  if (summary?.failed) score += summary.failed * 50;
  if (run.status === "in_progress") score += 650;
  if (run.status === "queued" || run.status === "waiting") {
    score += 500;
    score += Math.floor(getRunQueueAgeMs(run) / 60000);
  }
  if (summary?.running) score += summary.running * 20;
  if (summary?.waiting || summary?.pending || summary?.queued) {
    score += (summary.waiting + summary.pending + summary.queued) * 5;
  }

  return score;
}

function getRunGroup(run: WorkflowRun, groupMode: GroupMode) {
  switch (groupMode) {
    case "repo":
      return {
        key: `repo:${run.repository.name}`,
        label: run.repository.name,
      };
    case "workflow":
      return {
        key: `workflow:${run.name ?? run.display_title}`,
        label: run.name ?? run.display_title,
      };
    case "branch":
      return {
        key: `branch:${run.head_branch ?? "no-branch"}`,
        label: run.head_branch ?? "No branch",
      };
    case "status":
      return {
        key: `status:${run.status ?? run.conclusion ?? "unknown"}`,
        label: formatRunStatusGroup(run),
      };
    case "none":
    default:
      return {
        key: "all",
        label: "All runs",
      };
  }
}

function formatRunStatusGroup(run: WorkflowRun) {
  if (run.conclusion === "failure") return "Failed";
  if (run.status === "in_progress") return "Running";
  if (run.status === "queued" || run.status === "waiting") return "Queued";
  if (run.conclusion === "success") return "Successful";
  return run.status ?? run.conclusion ?? "Unknown";
}

function GroupHeader({
  label,
  count,
  failedCount,
  activeCount,
  queuedCount,
}: {
  label: string;
  count: number;
  failedCount: number;
  activeCount: number;
  queuedCount: number;
}) {
  const tone =
    failedCount > 0 ? "danger" : activeCount > 0 ? "info" : queuedCount > 0 ? "warning" : "default";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-2",
        tone === "danger" && "border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20",
        tone === "info" && "border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20",
        tone === "warning" && "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20",
        tone === "default" && "bg-muted/25"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{count} runs</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {failedCount > 0 && (
          <span className="rounded-full border border-red-200 bg-red-100 px-2 py-1 font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {failedCount} failed
          </span>
        )}
        {activeCount > 0 && (
          <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-1 font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            {activeCount} active
          </span>
        )}
        {queuedCount > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-1 font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {queuedCount} queued
          </span>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  className?: string;
}

function StatCard({ label, value, icon: Icon, iconClassName, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex items-center gap-3 transition-colors",
        className
      )}
    >
      <Icon className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
