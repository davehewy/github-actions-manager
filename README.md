# GitHub Actions Manager

> **Status:** v0.1.0 — Early development. No production features are implemented yet.
> This project is under active development. Expect breaking changes.

## Why This Exists

Managing GitHub Actions across multiple repositories is painful. The built-in GitHub UI is scoped to individual repositories, which means there is no centralized way to:

- **Monitor workflow runs** across all your repos in one place
- **Spot failures quickly** without clicking through each repository
- **Compare workflow performance** or identify patterns across projects
- **Manage and trigger workflows** from a single dashboard

GitHub Actions Manager aims to solve this by providing a dedicated web interface for cross-repository Actions management — a single pane of glass for everything GitHub Actions.

## Planned Features

The following features are planned but not yet implemented:

- **Dashboard overview** — At-a-glance status of all monitored repositories and their latest workflow runs
  <!-- Screenshot: Dashboard overview — add to docs/screenshots/dashboard.png when available -->

- **Workflow run monitoring** — Live view of running, queued, and completed workflow runs with status indicators
  <!-- Screenshot: Workflow runs list — add to docs/screenshots/workflows.png when available -->

- **Cross-repository view** — Aggregate workflows from multiple repositories into a unified, filterable list
  <!-- Screenshot: Cross-repo dashboard — add to docs/screenshots/cross-repo.png when available -->

- **Run details and log viewer** — Drill into individual runs to view logs, job breakdowns, and timing data
  <!-- Screenshot: Run details view — add to docs/screenshots/run-details.png when available -->

- **Dark mode** — Full dark mode support for late-night CI debugging sessions
  <!-- Screenshot: Dark mode — add to docs/screenshots/dark-mode.png when available -->

> **Note:** When screenshots are ready, create `docs/screenshots/` and replace the HTML comments above with standard markdown image syntax (e.g., `![Dashboard](docs/screenshots/dashboard.png)`).

## Tech Stack

Versions sourced from `package.json`:

| Technology | Version | Notes |
|------------|---------|-------|
| [Next.js](https://nextjs.org) | 16.1.4 | App Router |
| [React](https://react.dev) | 19.2.3 | |
| [TypeScript](https://www.typescriptlang.org) | 5 | Strict mode enabled |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Via PostCSS |
| [ESLint](https://eslint.org) | 9 | With `next/core-web-vitals` and TypeScript rules |

## Getting Started

### Prerequisites

- **Node.js v20 or later** (LTS recommended) — the project declares `@types/node: ^20`; no `.nvmrc` is configured
- **npm** — this project uses `package-lock.json` as its lockfile

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/github-actions-manager.git
cd github-actions-manager

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create an optimized production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint across the project |

## Project Structure

```
src/
  app/
    layout.tsx      # Root layout with fonts and metadata
    page.tsx        # Home page
    globals.css     # Global styles (Tailwind imports)
    favicon.ico     # App icon
public/             # Static assets
```

**Configuration files:**

- `next.config.ts` — Next.js configuration
- `tsconfig.json` — TypeScript configuration (path alias: `@/*` maps to `./src/*`)
- `eslint.config.mjs` — ESLint flat config
- `postcss.config.mjs` — PostCSS configuration (Tailwind CSS plugin)

## Development

- The dev server runs at `http://localhost:3000` with hot module replacement
- **Path aliases:** Import from `@/*` which resolves to `./src/*`
- **TypeScript:** Strict mode is enabled
- **Styling:** Use Tailwind CSS utility classes

## Contributing

Contributions are welcome once the project reaches a stable foundation. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes with clear, descriptive messages
4. Open a pull request against `main`

> **Important:** A license must be chosen and added to this repository before external contributions can be accepted. See the [License](#license) section below.

## Roadmap

- [ ] GitHub OAuth integration
- [ ] Repository connection and workflow discovery
- [ ] Dashboard with real-time workflow status
- [ ] Cross-repository workflow aggregation
- [ ] Run detail view with log streaming
- [ ] Notification preferences and alerts
- [ ] Dark mode toggle

## License

**TODO:** No license has been chosen yet. A `LICENSE` file must be added to this repository before distributing or accepting contributions. Until then, all rights are reserved by default.
