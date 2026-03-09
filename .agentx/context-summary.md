# Context Summary: GitHub Actions Manager

## Key Files Analyzed

| File | Role |
|------|------|
| `package.json` | Project metadata — name: `github-actions-manager`, v0.1.0, private. Next.js 16.1.4, React 19.2.3 |
| `README.md` | Currently the default `create-next-app` boilerplate — needs full replacement |
| `src/app/page.tsx` | Home page — default Next.js template, no custom UI yet |
| `src/app/layout.tsx` | Root layout — Geist fonts, metadata still says "Create Next App" |
| `src/app/globals.css` | Global styles — Tailwind v4 import, CSS custom properties for light/dark theming |
| `next.config.ts` | Minimal/empty Next.js config |
| `tsconfig.json` | TypeScript strict mode, `@/*` path alias to `./src/*`, ES2017 target |
| `eslint.config.mjs` | ESLint 9 flat config with Next.js core-web-vitals + TypeScript rules |
| `postcss.config.mjs` | PostCSS with `@tailwindcss/postcss` plugin (Tailwind v4 integration) |
| `CLAUDE.md` | AI agent instructions — template with placeholder sections, not yet populated |
| `.claude/settings.json` | Permission hooks config for agentx sandbox |

## Architectural Patterns

- **Next.js App Router** — Using the modern `src/app/` directory structure (not Pages Router)
- **Tailwind CSS v4** — New `@import "tailwindcss"` and `@theme inline` syntax (not the v3 `@tailwind` directives)
- **TypeScript strict mode** — All source files are `.tsx`/`.ts`
- **Path aliases** — `@/*` resolves to `./src/*`
- **Dark mode** — System preference-based via `prefers-color-scheme` CSS media query
- **Font loading** — `next/font/google` with Geist Sans and Geist Mono

## Important Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| next | 16.1.4 | Latest major version with App Router |
| react | 19.2.3 | React 19 (latest) |
| tailwindcss | ^4 | v4 with new architecture |
| typescript | ^5 | Strict mode enabled |
| eslint | ^9 | Flat config format |

## Project State

- **Phase:** Initial bootstrap — no custom features implemented
- **Branch:** `feat-readme` (git worktree)
- **No tests:** No test framework installed (no Jest, Vitest, Playwright, etc.)
- **No CI/CD:** No `.github/workflows/` directory
- **No remote:** No git remote configured (or not accessible from worktree)
- **No custom components:** Only the default Next.js starter page exists
