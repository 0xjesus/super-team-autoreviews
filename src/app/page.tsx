import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Zap, Shield, BarChart } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            AI-Powered GitHub
            <br />
            <span className="text-primary">Auto-Reviews</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Automated code review system for Superteam Earn. Analyze PRs and repositories
            with AI-powered insights, security checks, and requirement matching.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
            <a
              href="https://github.com/superteamdao/earn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                <GitBranch className="w-4 h-4 mr-2" />
                View on GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Fast Analysis"
              description="Powered by Inngest for async processing. Handle large repos without timeouts."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Security Checks"
              description="Detect hardcoded secrets, vulnerabilities, and Solana-specific security issues."
            />
            <FeatureCard
              icon={<BarChart className="w-8 h-8" />}
              title="Detailed Scoring"
              description="Get scores for requirements, code quality, completeness, and security."
            />
            <FeatureCard
              icon={<GitBranch className="w-8 h-8" />}
              title="PR & Repo Support"
              description="Review both pull requests and full repositories with context-aware analysis."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Step
              number={1}
              title="Submit URL"
              description="Enter a public GitHub PR or repository URL along with bounty requirements."
            />
            <Step
              number={2}
              title="AI Analysis"
              description="Our AI analyzes the code against requirements, checking quality and security."
            />
            <Step
              number={3}
              title="Get Results"
              description="Receive a detailed score, labels, and actionable feedback for sponsors."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to automate your reviews?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Start using AI-powered code reviews for your Superteam Earn bounties today.
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Built for Superteam Earn by the community
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="https://earn.superteam.fun" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Superteam Earn
            </a>
            <a href="https://github.com/superteamdao/earn" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="text-primary mb-2">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
