import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createOctokit,
  getOrgRepos,
  getUserRepos,
  getUser,
  getOrgWorkflowRuns,
} from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org } = await params;
    const octokit = createOctokit(session.accessToken);

    // Check if this is user's personal account
    const user = await getUser(octokit);
    const isUserAccount = org === user.login;

    // Get repos first
    const repos = isUserAccount
      ? await getUserRepos(octokit)
      : await getOrgRepos(octokit, org);

    // Get workflow runs for all repos
    const response = await getOrgWorkflowRuns(octokit, org, repos);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching workflow runs:", error);
    return toGitHubErrorResponse(error, "Failed to fetch workflow runs");
  }
}
