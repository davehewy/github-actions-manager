"use client";

import { useSession } from "next-auth/react";
import { LoginButton } from "@/components/auth/login-button";
import { WorkflowDashboard } from "@/components/dashboard/workflow-dashboard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  GitBranch,
  Github,
  Loader2,
  RefreshCw,
  Eye,
  Zap,
  Shield,
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <WorkflowDashboard />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Actions Manager</span>
          </div>
          <LoginButton />
        </div>
      </div>
    </header>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <Activity className="relative h-16 w-16 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            GitHub Actions
            <span className="block text-primary">Manager</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Monitor, manage, and optimize your GitHub Actions workflows across all your organizations from a single dashboard.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <LoginButton />
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="h-5 w-5" />
                Learn More
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Features Section */}
      <div className="py-16 px-4 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything you need to manage your workflows
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Eye}
              title="Real-time Monitoring"
              description="Watch your workflows as they run with live status updates and automatic refresh."
            />
            <FeatureCard
              icon={RefreshCw}
              title="Quick Actions"
              description="Re-run workflows, retry failed jobs, or cancel running builds with a single click."
            />
            <FeatureCard
              icon={GitBranch}
              title="Multi-Repo Overview"
              description="See all workflow runs across your entire organization in one unified view."
            />
            <FeatureCard
              icon={Zap}
              title="Instant Logs"
              description="Access build logs instantly without leaving the dashboard."
            />
            <FeatureCard
              icon={Shield}
              title="Secure by Design"
              description="Uses GitHub OAuth with minimal required permissions to keep your data safe."
            />
            <FeatureCard
              icon={Activity}
              title="Status at a Glance"
              description="Clear visual indicators show you which builds need attention."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js, Tailwind CSS, and the GitHub API.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
      <Icon className="h-10 w-10 text-primary mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
