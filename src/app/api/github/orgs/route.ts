import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getOrganizations, getUser } from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);

    // Get both orgs and user (for personal repos option)
    const [orgs, user] = await Promise.all([
      getOrganizations(octokit),
      getUser(octokit),
    ]);

    // Add user as first option (for personal repos)
    const allOptions = [
      {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        description: "Personal repositories",
        isUser: true,
      },
      ...orgs.map((org) => ({ ...org, isUser: false })),
    ];

    return NextResponse.json(allOptions);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return toGitHubErrorResponse(error, "Failed to fetch organizations");
  }
}
