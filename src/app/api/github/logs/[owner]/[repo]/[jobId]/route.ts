import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getJobLogs } from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { owner, repo, jobId } = await params;
    const octokit = createOctokit(session.accessToken);

    const logs = await getJobLogs(octokit, owner, repo, parseInt(jobId));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return toGitHubErrorResponse(error, "Failed to fetch logs");
  }
}
