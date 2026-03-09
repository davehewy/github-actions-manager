import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createOctokit,
  getWorkflowJobs,
  type WorkflowRunJobSummariesResponse,
} from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";
import { summarizeWorkflowJobs } from "@/lib/workflow-status";

interface SummaryRequestRun {
  repo: string;
  runId: number;
}

interface SummaryRequestBody {
  runs?: SummaryRequestRun[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SummaryRequestBody;
    const requestedRuns = body.runs ?? [];
    const uniqueRuns = requestedRuns.filter(
      (run, index, allRuns) =>
        allRuns.findIndex(
          (candidate) => candidate.repo === run.repo && candidate.runId === run.runId
        ) === index
    );

    const { org } = await params;
    const octokit = createOctokit(session.accessToken);

    const response: WorkflowRunJobSummariesResponse = {
      summaries: {},
      meta: {
        requestedRuns: uniqueRuns.length,
        successfulRuns: 0,
        failedRuns: 0,
        fetchedAt: new Date().toISOString(),
      },
    };

    const batchSize = 6;

    for (let index = 0; index < uniqueRuns.length; index += batchSize) {
      const batch = uniqueRuns.slice(index, index + batchSize);
      const results = await Promise.allSettled(
        batch.map(async ({ repo, runId }) => {
          const jobs = await getWorkflowJobs(octokit, org, repo, runId);
          return {
            runId,
            summary: summarizeWorkflowJobs(jobs),
          };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          response.summaries[result.value.runId] = result.value.summary;
          response.meta.successfulRuns += 1;
        } else {
          response.meta.failedRuns += 1;
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching workflow run summaries:", error);
    return toGitHubErrorResponse(error, "Failed to fetch workflow run summaries");
  }
}
