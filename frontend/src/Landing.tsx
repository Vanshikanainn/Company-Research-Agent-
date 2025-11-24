import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Sparkles, Zap, ShieldCheck } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-primary">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzAwNjZGRiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="container relative mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm animate-fade-in">
              <Sparkles className="h-4 w-4" />
              <span>Advanced AI Research Platform</span>
            </div>
            
            <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Research Partner
            </h1>
            
            <p className="mb-8 text-xl text-white/90 md:text-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Your intelligent companion for comprehensive research and analysis.
              Powered by cutting-edge AI technology.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link to="/prompt">
                <Button size="lg" className="group bg-white text-primary hover:bg-white/90 hover:shadow-glow transition-all duration-300">
                  Start Research
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" className="group bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:shadow-glow transition-all duration-300">
                  View Documentation
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative gradient blob */}
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-accent opacity-20 blur-3xl"></div>
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary opacity-20 blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-foreground">
              Intelligent Research Capabilities
            </h2>
            <p className="text-lg text-muted-foreground">
              Experience the future of research with our advanced AI agent
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary hover:shadow-glow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                Deep Analysis
              </h3>
              <p className="text-muted-foreground">
                Advanced AI reasoning for comprehensive insights and detailed analysis
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary hover:shadow-glow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform group-hover:scale-110">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                Real-time Responses
              </h3>
              <p className="text-muted-foreground">
                Stream responses as they're generated for immediate insights
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary hover:shadow-glow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-white transition-transform group-hover:scale-110">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                Tool Integration
              </h3>
              <p className="text-muted-foreground">
                Execute complex research tasks with integrated AI tools
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary hover:shadow-glow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                Reliable Results
              </h3>
              <p className="text-muted-foreground">
                Trust in accurate, well-researched information every time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-12 md:p-16">
            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
                Ready to Transform Your Research?
              </h2>
              <p className="mb-8 text-xl text-white/90">
                Join the future of intelligent research assistance today
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link to="/prompt">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 hover:shadow-glow transition-all duration-300">
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button size="lg" className="bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:shadow-glow transition-all duration-300">
                    View Documentation
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white opacity-10 blur-3xl"></div>
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent opacity-10 blur-3xl"></div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;

