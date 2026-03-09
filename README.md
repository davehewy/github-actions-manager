# GitHub Actions Manager

A beautiful dashboard for monitoring and managing GitHub Actions workflows across your organizations.

## Features

- **Organization Selection**: Switch between your personal account and any organization you belong to
- **Real-time Monitoring**: Auto-refresh every 30 seconds with live status indicators
- **Workflow Overview**: See all workflow runs across all repositories in one view
- **Status Filtering**: Filter by running, queued, successful, or failed workflows
- **Job Details**: Expand any workflow to see individual job steps and their status
- **Build Logs**: View build logs directly in the dashboard
- **Quick Actions**: Re-run workflows, retry failed jobs, or cancel running builds with one click
- **Responsive Design**: Works great on desktop and mobile

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: NextAuth.js with GitHub OAuth
- **API Client**: Octokit (official GitHub SDK)
- **Language**: TypeScript

## Setup

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details (adjust port as needed):
   - **Application name**: GitHub Actions Manager (or your preferred name)
   - **Homepage URL**: `http://localhost:YOUR_PORT`
   - **Authorization callback URL**: `http://localhost:YOUR_PORT/api/auth/callback/github`
4. Click "Register application"
5. Generate a new client secret

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
GITHUB_ID=your_github_oauth_app_client_id
GITHUB_SECRET=your_github_oauth_app_client_secret
NEXTAUTH_URL=http://localhost:YOUR_PORT
NEXTAUTH_SECRET=your_random_secret_string
```

Generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev -- -p YOUR_PORT
```

Open `http://localhost:YOUR_PORT` in your browser.

## Usage

1. Click "Sign in with GitHub" on the landing page
2. Authorize the app to access your GitHub account
3. Select an organization or your personal account from the dropdown
4. Browse your workflow runs, filter by status, and manage your builds

## Required GitHub Permissions

The app requests the following OAuth scopes:

- `read:user` - Read user profile information
- `user:email` - Access email addresses
- `read:org` - List organizations
- `repo` - Access repositories (needed for workflow management)
- `workflow` - Manage workflow runs

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npx tsc --noEmit
```

## Deployment

This app can be deployed to any platform that supports Next.js:

- [Vercel](https://vercel.com) (recommended)
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- Self-hosted with Docker

Remember to update the OAuth callback URL in your GitHub OAuth App settings to match your production URL.

## License

MIT
