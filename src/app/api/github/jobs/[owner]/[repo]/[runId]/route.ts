import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getWorkflowJobs } from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; runId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { owner, repo, runId } = await params;
    const octokit = createOctokit(session.accessToken);

    const jobs = await getWorkflowJobs(octokit, owner, repo, parseInt(runId));

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return toGitHubErrorResponse(error, "Failed to fetch jobs");
  }
}
