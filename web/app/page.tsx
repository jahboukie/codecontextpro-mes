import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Database, Zap, Shield, Terminal, Search } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold">CodeContextPro-MES</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900"
              style={{ fontWeight: 500 }}
            >
              Pricing
            </Link>
            <Link
              href="/auth/signin"
              className="text-indigo-600 hover:text-indigo-500"
              style={{ fontWeight: 500 }}
            >
              Sign In
            </Link>
            <Badge variant="secondary">v2.0.0</Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Never Lose Context Again
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            CodeContextPro-MES provides persistent memory for AI coding assistants. 
            Store, search, and recall project context with advanced SQLite + FTS5 search.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              <Terminal className="mr-2 h-5 w-5" />
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Database className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>Local-First Storage</CardTitle>
              <CardDescription>
                SQLite database with better-sqlite3 for fast, reliable local storage
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Search className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>FTS5 Search</CardTitle>
              <CardDescription>
                Advanced full-text search with relevance ranking and semantic understanding
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Terminal className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>CLI Interface</CardTitle>
              <CardDescription>
                Simple command-line interface: ccpro remember, ccpro recall, ccpro status
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>High Performance</CardTitle>
              <CardDescription>
                Synchronous operations with better-sqlite3 for sub-second response times
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>Secure by Design</CardTitle>
              <CardDescription>
                Input validation, content filtering, and optional encryption
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>AI Integration</CardTitle>
              <CardDescription>
                Designed specifically for AI coding assistants and context management
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CLI Demo */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Simple CLI Commands</h2>
          <Card className="bg-gray-900 text-green-400 font-mono">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div>$ ccpro remember "This project uses TypeScript with strict mode"</div>
                <div className="text-gray-400">✅ Memory stored with ID: 42</div>
                <div className="mt-4">$ ccpro recall "TypeScript"</div>
                <div className="text-gray-400">✅ Found 3 memories - 95.7% relevance</div>
                <div className="mt-4">$ ccpro status</div>
                <div className="text-gray-400">📊 Total Memories: 156 | Database: 2.3 KB</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2025 CodeContextPro-MES. Built with Next.js, Polar.sh, and better-sqlite3.</p>
        </div>
      </footer>
    </div>
  );
}
