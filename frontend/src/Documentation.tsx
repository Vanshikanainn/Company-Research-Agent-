import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Book, Sparkles, Code, Zap, Server, FileText, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';

const Documentation = () => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the README.md file from the public folder
    fetch('/README.md')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load documentation');
        }
        return response.text();
      })
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-gradient-primary">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzAwNjZGRiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="container relative mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <Link to="/">
              <Button className="group flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Home</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Book className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Documentation</h1>
                <p className="text-sm text-white/80">Complete API & Setup Guide</p>
              </div>
            </div>
            <div className="w-32"></div>
          </div>
        </div>

        {/* Decorative gradient blobs */}
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-accent opacity-20 blur-3xl"></div>
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl"></div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Book className="h-8 w-8 text-white animate-pulse" />
              </div>
              <div className="flex gap-1.5 py-2 mb-4 justify-center">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
              <p className="text-lg font-medium text-muted-foreground">Loading documentation...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="font-bold text-red-800 mb-1">Error Loading Documentation</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && markdown && (
          <div className="space-y-8 animate-fade-in">
            {/* Markdown Content with Enhanced Styling */}
            <div className="prose-docs">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="group relative mb-8 mt-12 pb-4 text-4xl font-bold text-foreground border-b-2 border-primary/20 first:mt-0">
                      <span className="absolute left-0 top-0 h-full w-1 bg-gradient-primary rounded-r"></span>
                      <span className="pl-4">{children}</span>
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="group relative mb-6 mt-10 pb-3 text-3xl font-bold text-foreground border-b border-primary/10 flex items-center gap-3">
                      <ChevronRight className="h-6 w-6 text-primary opacity-60" />
                      <span>{children}</span>
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-4 mt-8 text-2xl font-semibold text-foreground flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      <span>{children}</span>
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="mb-3 mt-6 text-xl font-semibold text-foreground">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-base leading-relaxed text-foreground/90">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-6 ml-6 space-y-2 list-disc marker:text-primary">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-6 ml-6 space-y-2 list-decimal marker:text-primary marker:font-bold">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-foreground/90 leading-relaxed pl-2">{children}</li>
                  ),
                  code: ({ className, children, ...props }: any) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-2 py-1 text-sm font-mono bg-primary/10 text-primary rounded-md border border-primary/20" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <div className="group relative mb-6 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
                      <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800/50 px-4 py-2">
                        <div className="flex gap-1.5">
                          <div className="h-3 w-3 rounded-full bg-red-500"></div>
                          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="ml-4 flex items-center gap-2 text-xs text-slate-400">
                          <Code className="h-3 w-3" />
                          <span>Code</span>
                        </div>
                      </div>
                      <pre className="p-4 overflow-x-auto text-sm text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-slate-100 [&>code]:border-0">
                        {children}
                      </pre>
                    </div>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="relative my-6 rounded-r-xl border-l-4 border-primary bg-primary/5 p-4 pl-6 italic text-foreground/80 shadow-sm">
                      <div className="absolute left-2 top-4 text-2xl text-primary/30">"</div>
                      <div className="relative z-10">{children}</div>
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target={href?.startsWith('http') ? '_blank' : undefined}
                      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors underline decoration-2 underline-offset-2 decoration-primary/30 hover:decoration-primary"
                    >
                      {children}
                      {href?.startsWith('http') && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="my-8 overflow-hidden rounded-xl border border-border shadow-lg">
                      <table className="w-full border-collapse bg-card">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gradient-primary text-white">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-6 py-4 text-left font-semibold text-sm">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-6 py-3 border-t border-border text-foreground/90">{children}</td>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="bg-card [&>tr:nth-child(even)]:bg-slate-50/50 [&>tr:hover]:bg-primary/5 transition-colors">
                      {children}
                    </tbody>
                  ),
                  hr: () => (
                    <hr className="my-8 border-0 border-t-2 border-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-foreground">{children}</strong>
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>

            {/* Quick Links Card */}
            <div className="mt-12 rounded-2xl border border-border bg-gradient-to-br from-card to-slate-50/50 p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Quick Links</h3>
                  <p className="text-sm text-muted-foreground">Get started quickly</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  to="/prompt"
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary hover:shadow-glow"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Start Research</div>
                    <div className="text-xs text-muted-foreground">Try the AI agent</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
                <Link
                  to="/"
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary hover:shadow-glow"
                >
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Home</div>
                    <div className="text-xs text-muted-foreground">Back to landing</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </Link>
                <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 opacity-60">
                  <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                    <Server className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">API Docs</div>
                    <div className="text-xs text-muted-foreground">See above</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Documentation;

