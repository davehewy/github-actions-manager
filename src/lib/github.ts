import { Octokit } from "@octokit/rest";
import type { RateLimitInfo } from "@/lib/api-error";

export function createOctokit(accessToken: string) {
  return new Octokit({
    auth: accessToken,
  });
}

export interface Organization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string | undefined;
}

export interface WorkflowRun {
  id: number;
  name: string | null | undefined;
  workflow_id: number;
  head_branch: string | null;
  head_sha: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null | undefined;
  run_number: number;
  run_attempt: number | undefined;
  event: string;
  display_title: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
  };
  actor: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface WorkflowRunsMeta {
  totalRepositories: number;
  loadedRepositories: number;
  failedRepositories: number;
  failedRepositoryNames: string[];
  fetchedAt: string;
  rateLimit?: RateLimitInfo | null;
}

export interface WorkflowRunsResponse {
  runs: WorkflowRun[];
  meta: WorkflowRunsMeta;
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
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

export interface WorkflowRunJobSummariesResponse {
  summaries: Record<number, WorkflowRunJobSummary>;
  meta: {
    requestedRuns: number;
    successfulRuns: number;
    failedRuns: number;
    fetchedAt: string;
  };
}

export async function getOrganizations(octokit: Octokit): Promise<Organization[]> {
  const { data } = await octokit.orgs.listForAuthenticatedUser();
  return data.map((org) => ({
    login: org.login,
    id: org.id,
    avatar_url: org.avatar_url,
    description: org.description,
  }));
}

export async function getUser(octokit: Octokit) {
  const { data } = await octokit.users.getAuthenticated();
  return {
    login: data.login,
    id: data.id,
    avatar_url: data.avatar_url,
    name: data.name,
  };
}

export async function getOrgRepos(octokit: Octokit, org: string): Promise<Repository[]> {
  const repos: Repository[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.repos.listForOrg({
      org,
      per_page: perPage,
      page,
      sort: "updated",
      direction: "desc",
    });

    repos.push(
      ...data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        html_url: repo.html_url,
        description: repo.description,
        default_branch: repo.default_branch,
      }))
    );

    if (data.length < perPage) break;
    page++;
    if (page > 5) break; // Limit to 500 repos max
  }

  return repos;
}

export async function getUserRepos(octokit: Octokit): Promise<Repository[]> {
  const repos: Repository[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: perPage,
      page,
      sort: "updated",
      direction: "desc",
      affiliation: "owner",
    });

    repos.push(
      ...data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        html_url: repo.html_url,
        description: repo.description,
        default_branch: repo.default_branch,
      }))
    );

    if (data.length < perPage) break;
    page++;
    if (page > 5) break;
  }

  return repos;
}

export async function getWorkflowRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  options: { per_page?: number; status?: string } = {}
): Promise<WorkflowRun[]> {
  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: options.per_page || 30,
    ...(options.status && { status: options.status as "queued" | "in_progress" | "completed" }),
  });

  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    workflow_id: run.workflow_id,
    head_branch: run.head_branch,
    head_sha: run.head_sha,
    status: run.status,
    conclusion: run.conclusion,
    html_url: run.html_url,
    created_at: run.created_at,
    updated_at: run.updated_at,
    run_started_at: run.run_started_at,
    run_number: run.run_number,
    run_attempt: run.run_attempt,
    event: run.event,
    display_title: run.display_title,
    repository: {
      id: run.repository.id,
      name: run.repository.name,
      full_name: run.repository.full_name,
    },
    actor: run.actor
      ? {
          login: run.actor.login,
          avatar_url: run.actor.avatar_url,
        }
      : null,
  }));
}

export async function getOrgWorkflowRuns(
  octokit: Octokit,
  org: string,
  repos: Repository[]
): Promise<WorkflowRunsResponse> {
  const allRuns: WorkflowRun[] = [];
  const failedRepositoryNames: string[] = [];
  let rateLimit: RateLimitInfo | null = null;

  // Fetch workflow runs for all repos in parallel (batched)
  const batchSize = 10;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((repo) =>
        getWorkflowRuns(octokit, org, repo.name, { per_page: 10 })
      )
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        allRuns.push(...result.value);
      } else {
        failedRepositoryNames.push(batch[index].name);
        rateLimit = rateLimit ?? extractRateLimitInfo(result.reason);
      }
    }
  }

  // Sort by created_at descending
  allRuns.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    runs: allRuns,
    meta: {
      totalRepositories: repos.length,
      loadedRepositories: repos.length - failedRepositoryNames.length,
      failedRepositories: failedRepositoryNames.length,
      failedRepositoryNames,
      fetchedAt: new Date().toISOString(),
      rateLimit,
    },
  };
}

export async function getWorkflowJobs(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<WorkflowJob[]> {
  const { data } = await octokit.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
  });

  return data.jobs.map((job) => ({
    id: job.id,
    run_id: job.run_id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    started_at: job.started_at,
    completed_at: job.completed_at,
    steps: job.steps?.map((step) => ({
      name: step.name,
      status: step.status,
      conclusion: step.conclusion,
      number: step.number,
      started_at: step.started_at,
      completed_at: step.completed_at,
    })),
  }));
}

export async function getJobLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number
): Promise<string> {
  try {
    const { data } = await octokit.actions.downloadJobLogsForWorkflowRun({
      owner,
      repo,
      job_id: jobId,
    });
    return data as unknown as string;
  } catch (error) {
    if (
      (error as { status?: number })?.status === 404 ||
      (error as { response?: { status?: number } })?.response?.status === 404
    ) {
      return "Logs not available";
    }

    throw error;
  }
}

function extractRateLimitInfo(error: unknown): RateLimitInfo | null {
  const responseHeaders = (error as { response?: { headers?: Record<string, string> } })?.response?.headers;
  const status =
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status ??
    null;
  const message =
    (error as { message?: string })?.message ??
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    "";
  const remainingHeader =
    responseHeaders?.["x-ratelimit-remaining"] ?? responseHeaders?.["X-RateLimit-Remaining"];
  const remaining = remainingHeader ? Number(remainingHeader) : null;

  if (status !== 429 && remaining !== 0 && !/rate limit/i.test(message)) {
    return null;
  }

  const resetHeader =
    responseHeaders?.["x-ratelimit-reset"] ?? responseHeaders?.["X-RateLimit-Reset"];
  const retryAfterHeader =
    responseHeaders?.["retry-after"] ?? responseHeaders?.["Retry-After"];
  const resetEpoch = resetHeader ? Number(resetHeader) : null;
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;

  return {
    limited: true,
    resetAt: resetEpoch ? new Date(resetEpoch * 1000).toISOString() : null,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resource:
      responseHeaders?.["x-ratelimit-resource"] ??
      responseHeaders?.["X-RateLimit-Resource"] ??
      null,
  };
}

export async function rerunWorkflow(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<void> {
  await octokit.actions.reRunWorkflow({
    owner,
    repo,
    run_id: runId,
  });
}

export async function rerunFailedJobs(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<void> {
  await octokit.actions.reRunWorkflowFailedJobs({
    owner,
    repo,
    run_id: runId,
  });
}

export async function cancelWorkflow(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<void> {
  await octokit.actions.cancelWorkflowRun({
    owner,
    repo,
    run_id: runId,
  });
}
