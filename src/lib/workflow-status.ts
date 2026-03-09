import type { WorkflowJob } from "@/lib/github";

export interface WorkflowJobStepSummary {
  total: number;
  completed: number;
  running: number;
  waiting: number;
  pending: number;
  queued: number;
  failed: number;
  cancelled: number;
  succeeded: number;
  skipped: number;
  hasStarted: boolean;
}

export interface WorkflowRunJobSummary {
  total: number;
  completed: number;
  running: number;
  waiting: number;
  pending: number;
  queued: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  skipped: number;
}

const ACTIVE_WORKFLOW_STATUSES = new Set(["queued", "in_progress", "waiting", "pending"]);

export function isActiveWorkflowStatus(status: string | null | undefined) {
  return ACTIVE_WORKFLOW_STATUSES.has(status ?? "");
}

export function getWorkflowJobStepSummary(job: WorkflowJob): WorkflowJobStepSummary {
  const steps = job.steps ?? [];

  return {
    total: steps.length,
    completed: steps.filter((step) => step.status === "completed").length,
    running: steps.filter((step) => step.status === "in_progress").length,
    waiting: steps.filter((step) => step.status === "waiting").length,
    pending: steps.filter((step) => step.status === "pending").length,
    queued: steps.filter((step) => step.status === "queued").length,
    failed: steps.filter(
      (step) => step.conclusion === "failure" || step.conclusion === "timed_out"
    ).length,
    cancelled: steps.filter((step) => step.conclusion === "cancelled").length,
    succeeded: steps.filter((step) => step.conclusion === "success").length,
    skipped: steps.filter((step) => step.conclusion === "skipped").length,
    hasStarted: steps.some(
      (step) =>
        step.status === "completed" ||
        step.status === "in_progress" ||
        !!step.started_at ||
        step.conclusion !== null
    ),
  };
}

export function getDisplayedWorkflowJobState(job: WorkflowJob) {
  const summary = getWorkflowJobStepSummary(job);

  if (summary.total === 0 || job.status === "completed") {
    return {
      status: job.status,
      conclusion: job.conclusion,
      summary,
    };
  }

  if (summary.completed === summary.total) {
    const conclusion =
      summary.failed > 0
        ? "failure"
        : summary.cancelled > 0
          ? "cancelled"
          : summary.succeeded > 0
            ? "success"
            : summary.skipped === summary.total
              ? "skipped"
              : job.conclusion;

    return {
      status: "completed",
      conclusion,
      summary,
    };
  }

  if (summary.running > 0 || summary.waiting > 0 || summary.hasStarted) {
    return {
      status: summary.waiting > 0 && summary.running === 0 ? "waiting" : "in_progress",
      conclusion: null,
      summary,
    };
  }

  if (summary.pending > 0) {
    return {
      status: "pending",
      conclusion: null,
      summary,
    };
  }

  return {
    status: job.status,
    conclusion: job.conclusion,
    summary,
  };
}

export function summarizeWorkflowJobs(jobs: WorkflowJob[]): WorkflowRunJobSummary {
  return jobs.reduce<WorkflowRunJobSummary>(
    (summary, job) => {
      const displayed = getDisplayedWorkflowJobState(job);

      summary.total += 1;

      switch (displayed.status) {
        case "completed":
          summary.completed += 1;
          switch (displayed.conclusion) {
            case "success":
              summary.succeeded += 1;
              break;
            case "failure":
            case "timed_out":
              summary.failed += 1;
              break;
            case "cancelled":
              summary.cancelled += 1;
              break;
            case "skipped":
              summary.skipped += 1;
              break;
            default:
              break;
          }
          break;
        case "in_progress":
          summary.running += 1;
          break;
        case "waiting":
          summary.waiting += 1;
          break;
        case "pending":
          summary.pending += 1;
          break;
        default:
          summary.queued += 1;
      }

      return summary;
    },
    {
      total: 0,
      completed: 0,
      running: 0,
      waiting: 0,
      pending: 0,
      queued: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      skipped: 0,
    }
  );
}
