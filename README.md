# GitHub Actions Manager

A unified dashboard for monitoring and managing GitHub Actions workflows across all your organizations — from a single browser tab.

<!-- TODO: Add hero screenshot
![GitHub Actions Manager Dashboard](docs/screenshots/dashboard-overview.png)
-->

---

## Why This Exists

GitHub's built-in Actions UI works fine when you're checking on one repository at a time. But if you manage CI/CD across multiple repos — or across multiple organizations — the experience quickly falls apart:

- **No cross-repo view.** You have to click into each repository individually to see its workflow runs. If you maintain 20+ repos, that's 20+ tabs.
- **No cross-org view.** If you belong to several organizations, there's no way to see all their workflows in one place. You have to switch org contexts manually.
- **Slow log access.** Getting to a specific job's logs requires multiple clicks through the run → job → step hierarchy.
- **No prioritization.** Failures, in-progress runs, and queued builds are all mixed together with no way to surface what needs attention first.

GitHub Actions Manager solves these problems by aggregating all your workflow runs into a single, filterable, sortable dashboard with one-click actions and instant log access.

---

## Features

### Real-Time Monitoring
Auto-refreshes every 30 seconds (toggleable) with live status indicators. You always see the latest state without manually reloading.

### Organization & Account Switching
Switch between your personal account and any organization you belong to with a dropdown selector. All repos for the selected account are loaded automatically.

<!-- TODO: Add screenshot of org selector dropdown
![Organization Selector](docs/screenshots/org-selector.png)
-->

### Status Filtering
Filter runs by status — **running**, **queued**, **success**, or **failure** — to focus on what matters right now. Live statistics show counts for each status at the top of the dashboard.

<!-- TODO: Add screenshot of status filtering
![Status Filtering](docs/screenshots/status-filtering.png)
-->

### Smart Sorting
Six sort modes to organize your workflow runs:

| Mode | Description |
|------|-------------|
| **Priority** | Failures first, then active runs, then queued — with a scoring algorithm that factors in failed job count and queue age |
| **Newest** | Most recently created first |
| **Oldest** | Oldest first |
| **Duration** | Longest-running first |
| **Queue Age** | Longest-waiting queued runs first |
| **Repository** | Alphabetical by repository name |

### Grouping
Group workflow runs by **repository**, **workflow name**, **branch**, or **status** for quick scanning of related runs.

### Two View Modes
- **Cards** — A spacious card-based grid layout (default)
- **Ops** — A compact, table-like operations view for high-density monitoring

<!-- TODO: Add screenshot showing both view modes side-by-side
![View Modes — Cards and Ops](docs/screenshots/view-modes.png)
-->

### Expandable Job Details
Click any workflow run to expand it and see individual job steps with their status, duration, and outcome. Job summaries are loaded automatically for expanded, active, and failed runs.

<!-- TODO: Add screenshot of expanded job details
![Expanded Job Details](docs/screenshots/job-details.png)
-->

### Direct Log Access
View build logs for any job directly in the dashboard — no navigating away to GitHub.

### One-Click Actions
- **Re-run** — Re-run an entire workflow
- **Retry failed** — Re-run only the failed jobs in a workflow
- **Cancel** — Cancel a running or queued workflow

### Rate Limit Awareness
Detects GitHub API rate limits and automatically pauses auto-refresh, showing you when the limit resets so you know exactly when data will flow again.

### Batch Job Summary Loading
Fetches job summaries in batches of 6 with progress indicators, prioritizing expanded runs, active runs, and failures.

### Responsive Design
Works on desktop and mobile. The layout adapts to your screen size.

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | [Next.js](https://nextjs.org) (App Router) | 16.1.4 |
| UI Library | [React](https://react.dev) | 19.2.3 |
| Language | [TypeScript](https://www.typescriptlang.org) | 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) | 4 |
| Components | [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives) | — |
| Auth | [NextAuth.js](https://next-auth.js.org) | 4.24.13 |
| GitHub API | [Octokit](https://github.com/octokit/rest.js) | 22.0.1 |
| Date Utilities | [date-fns](https://date-fns.org) | 4.1.0 |
| Icons | [Lucide React](https://lucide.dev) | 0.562.0 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+ (LTS recommended)
- A [GitHub](https://github.com) account
- A GitHub OAuth App (created in the next step)

### 1. Create a GitHub OAuth App

1. Go to **[GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)**
2. Click **"New OAuth App"**
3. Fill in the form:

   | Field | Value |
   |-------|-------|
   | Application name | `GitHub Actions Manager` (or any name you prefer) |
   | Homepage URL | `http://localhost:3000` |
   | Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"** and copy the secret immediately (it won't be shown again)

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# GitHub OAuth App credentials
GITHUB_ID=your_client_id_here
GITHUB_SECRET=your_client_secret_here

# NextAuth.js configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

> **All four variables are required.** There are no optional environment variables.

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To run on a different port:

```bash
npm run dev -- -p 4000
```

> If you change the port, update `NEXTAUTH_URL` and the OAuth callback URL in your GitHub OAuth App settings to match.

---

## Usage

### Sign In

Click **"Sign in with GitHub"** on the landing page. You'll be redirected to GitHub to authorize the app. Once authorized, you'll land on the dashboard.

<!-- TODO: Add screenshot of landing page
![Landing Page](docs/screenshots/landing-page.png)
-->

### Navigate the Dashboard

1. **Select an account** — Use the dropdown at the top to switch between your personal account and any organization you belong to.
2. **Review the statistics bar** — See total, running, queued, success, and failure counts at a glance.
3. **Filter by status** — Click a status filter to narrow down the list.
4. **Sort and group** — Use the sort and group dropdowns to organize runs the way you want.
5. **Switch view modes** — Toggle between Cards and Ops view depending on your preference.

### Manage Workflow Runs

- **Expand a run** — Click on any workflow run card to see its jobs and step-level details.
- **View logs** — Click the log icon on any job to view its output directly.
- **Re-run** — Click the re-run button to trigger a fresh run of the entire workflow.
- **Retry failed** — Click retry to re-run only the jobs that failed.
- **Cancel** — Click cancel to stop a running or queued workflow.

---

## Project Structure

<details>
<summary>Click to expand</summary>

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts   # NextAuth.js handler
│   │   └── github/
│   │       ├── jobs/[owner]/[repo]/[runId]/route.ts    # Get jobs for a run
│   │       ├── logs/[owner]/[repo]/[jobId]/route.ts    # Get logs for a job
│   │       ├── orgs/route.ts                           # List user's orgs
│   │       ├── repos/[org]/route.ts                    # List repos for an org
│   │       ├── runs/[org]/route.ts                     # List workflow runs
│   │       ├── runs/[org]/summaries/route.ts           # Batch job summaries
│   │       ├── runs/[org]/[repo]/[runId]/cancel/route.ts       # Cancel a run
│   │       ├── runs/[org]/[repo]/[runId]/rerun/route.ts        # Re-run a workflow
│   │       ├── runs/[org]/[repo]/[runId]/rerun-failed/route.ts # Retry failed jobs
│   │       └── user/route.ts                           # Get authenticated user
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout with session provider
│   └── page.tsx           # Landing page + authenticated dashboard
├── components/
│   ├── auth/
│   │   └── login-button.tsx          # Sign in/out button with user menu
│   ├── dashboard/
│   │   ├── org-selector.tsx          # Organization/account dropdown
│   │   ├── status-badge.tsx          # Status indicator badges
│   │   ├── workflow-dashboard.tsx    # Main dashboard (filtering, sorting, grouping)
│   │   ├── workflow-jobs.tsx         # Expandable job/step details
│   │   └── workflow-run-card.tsx     # Individual workflow run card
│   ├── providers/
│   │   └── session-provider.tsx      # NextAuth session context
│   └── ui/                           # shadcn/ui components
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── collapsible.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── skeleton.tsx
│       ├── tabs.tsx
│       └── tooltip.tsx
├── lib/
│   ├── api-error.ts             # API error response helper
│   ├── auth.ts                  # NextAuth.js configuration
│   ├── github-route-error.ts    # GitHub API error handler
│   ├── github.ts                # Octokit client factory
│   ├── utils.ts                 # General utilities (cn, etc.)
│   └── workflow-status.ts       # Status mapping/normalization
└── types/
    └── next-auth.d.ts           # NextAuth type extensions
```

</details>

---

## Architecture

### Stateless Design

The app has **no database**. All workflow data is fetched live from the GitHub API on every request. This means:

- Zero infrastructure beyond a Next.js server
- No data synchronization issues
- No stale cached data (beyond the 30-second refresh interval)
- Nothing to back up or migrate

### Data Flow

```
Browser  →  Next.js API Routes  →  GitHub API (via Octokit)
   ↑              ↓
   └──── JSON responses ────┘
```

1. The React frontend calls internal Next.js API routes (e.g., `/api/github/runs/my-org`)
2. API routes authenticate the request using the NextAuth.js session (JWT-based)
3. API routes create an Octokit client using the user's GitHub access token
4. Octokit calls the GitHub REST API and returns the results
5. The frontend renders the data and manages client-side state (filtering, sorting, grouping)

### Authentication Flow

```
User clicks "Sign in with GitHub"
  → Redirected to GitHub OAuth authorization page
  → User approves requested scopes
  → GitHub redirects back with authorization code
  → NextAuth.js exchanges code for access token
  → Access token stored in encrypted JWT cookie
  → Subsequent API requests use token from JWT session
```

### Priority Scoring

When sorting by "Priority", runs are scored to surface the most important items:

| Condition | Points |
|-----------|--------|
| Run has failed | +1000 |
| Each failed job in the run | +50 |
| Run is in progress | +650 |
| Run is queued/waiting | +500 + queue age in minutes |
| Each running job | +20 |
| Each waiting/pending/queued job | +5 |

---

## Required GitHub Permissions

The OAuth App requests these scopes during sign-in:

| Scope | Purpose |
|-------|---------|
| `read:user` | Read your GitHub profile (username, avatar) |
| `user:email` | Access your email address for account identification |
| `read:org` | List organizations you belong to for the org selector |
| `repo` | Read repository and workflow run data across all your repos |
| `workflow` | Trigger re-runs, retry failed jobs, and cancel running workflows |

> **Note:** The `repo` scope is broad because GitHub's API requires it to access workflow run data for private repositories. The app only reads repository metadata and workflow run information — it does not modify your code or repository settings.

---

## Deployment

### Vercel (Recommended)

1. Push your code to a GitHub repository
2. Import the project in [Vercel](https://vercel.com/new)
3. Add your environment variables in the Vercel project settings:
   - `GITHUB_ID`
   - `GITHUB_SECRET`
   - `NEXTAUTH_URL` — set to your production URL (e.g., `https://actions.yourdomain.com`)
   - `NEXTAUTH_SECRET`
4. Deploy

### Other Platforms

This is a standard Next.js application and can be deployed anywhere Next.js runs:

- **[Netlify](https://netlify.com)** — Use the Next.js runtime plugin
- **[Railway](https://railway.app)** — Deploy directly from GitHub
- **Docker** — Use `npm run build && npm start` in your Dockerfile

### Post-Deployment Checklist

After deploying to production, update your GitHub OAuth App settings:

- **Homepage URL** → your production URL
- **Authorization callback URL** → `https://your-production-url/api/auth/callback/github`

---

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change, then submit a pull request.

---

## License

MIT
