import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getUser } from "@/lib/github";
import { toGitHubErrorResponse } from "@/lib/github-route-error";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const octokit = createOctokit(session.accessToken);
    const user = await getUser(octokit);

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return toGitHubErrorResponse(error, "Failed to fetch user");
  }
}
