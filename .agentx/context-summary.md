# Context Summary: GitHub Actions Manager

## Key Files Analyzed

| File | Role |
|------|------|
| `package.json` | Dependencies, scripts, project metadata (Next.js 16.1.4, React 19.2.3) |
| `README.md` | Existing basic README — outdated version refs, incomplete feature list |
| `src/app/page.tsx` | Landing page + authenticated dashboard entry point |
| `src/app/layout.tsx` | Root layout with SessionProvider |
| `src/components/dashboard/workflow-dashboard.tsx` | Main dashboard (1000+ lines) — filtering, sorting, grouping, auto-refresh, rate limit handling |
| `src/components/dashboard/workflow-run-card.tsx` | Individual workflow run display with expandable jobs and action buttons |
| `src/components/dashboard/workflow-jobs.tsx` | Job detail component with step-level status |
| `src/components/dashboard/org-selector.tsx` | Organization/account dropdown selector |
| `src/components/dashboard/status-badge.tsx` | Visual status indicators |
| `src/components/auth/login-button.tsx` | GitHub OAuth sign-in button |
| `src/lib/auth.ts` | NextAuth config — GitHub provider, JWT callbacks, OAuth scopes |
| `src/lib/github.ts` | GitHub API helpers, TypeScript type definitions for API responses |
| `src/lib/api-error.ts` | Error response types, rate limit extraction utilities |
| `src/lib/github-route-error.ts` | API route error handling with rate limit header parsing |
| `src/lib/workflow-status.ts` | Workflow status classification utilities |
| `src/app/api/github/orgs/route.ts` | GET orgs list API |
| `src/app/api/github/runs/[org]/route.ts` | GET workflow runs (batch fetches repos then runs) |
| `src/app/api/github/runs/[org]/summaries/route.ts` | POST batch job summaries |
| `src/app/api/github/runs/[org]/[repo]/[runId]/rerun/route.ts` | POST rerun workflow |
| `src/app/api/github/runs/[org]/[repo]/[runId]/cancel/route.ts` | POST cancel workflow |
| `src/app/api/github/jobs/[owner]/[repo]/[runId]/route.ts` | GET workflow jobs |
| `src/app/api/github/logs/[owner]/[repo]/[jobId]/route.ts` | GET job logs |

## Architectural Patterns

- **Next.js App Router** with client components (`"use client"` directives)
- **Stateless architecture** — no database; all data fetched from GitHub API in real-time
- **Server-side auth checks** — every API route verifies `session?.accessToken`
- **Batch API processing** — repos fetched 10 at a time, job summaries 6 at a time to manage rate limits
- **Rate limit awareness** — API responses include `x-ratelimit-remaining` and `x-ratelimit-reset` headers; UI shows countdown to reset
- **Component composition** — shadcn/ui primitives (Radix UI) composed into custom dashboard components
- **Session augmentation** — NextAuth JWT callback stores GitHub access token; session callback exposes it

## Important Dependencies & Integrations

- **GitHub OAuth** (NextAuth.js) — scopes: `read:user user:email read:org repo workflow`
- **GitHub REST API** (Octokit) — all data sourced from GitHub; no local storage
- **shadcn/ui** — component library pattern using Radix UI primitives with Tailwind CSS styling
- **Tailwind CSS v4** — CSS-based configuration (not tailwind.config.js), uses CSS custom properties for theming
- **No test framework** configured — no test files found
- **No CI/CD** configured — no `.github/workflows` directory
- **No `.env.example`** file exists despite README referencing one

## Notable Implementation Details

- Dashboard auto-refreshes every 30 seconds
- Filter modes: all, running, queued, success, failure
- Sort modes: priority, newest, oldest, duration, queue-age, repo
- Group modes: none, repo, workflow, branch, status
- View modes: cards (default), ops (compact table)
- Actions: rerun, retry-failed, cancel — all via POST to Next.js API routes
- Error handling includes structured `ApiErrorResponse` type with optional `rateLimit` field
