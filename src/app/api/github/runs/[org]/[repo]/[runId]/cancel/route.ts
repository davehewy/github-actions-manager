import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, cancelWorkflow } from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ org: string; repo: string; runId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org, repo, runId } = await params;
    const octokit = createOctokit(session.accessToken);

    await cancelWorkflow(octokit, org, repo, parseInt(runId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling workflow:", error);
    return toGitHubErrorResponse(error, "Failed to cancel workflow");
  }
}
