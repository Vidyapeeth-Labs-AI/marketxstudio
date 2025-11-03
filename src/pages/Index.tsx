import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Play } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">MarketX</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-foreground hover:text-primary transition-colors">Home</a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors">Services</a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors">About</a>
            </div>
            <Button onClick={() => navigate("/auth")} size="lg" className="rounded-full">
              Contact Us
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Grow Your Business<br />
              With Our <span className="text-primary">Marketing<br />Experts</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              We help brands to achieve their business goals. We bring creative ideas and trending innovations to life with our AI-powered marketing tools.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" onClick={() => navigate("/auth")} className="rounded-full">
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="rounded-full">
                <Play className="mr-2 h-4 w-4" />
                Watch Video
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section id="services" className="container mx-auto px-4 py-20">
        <div className="mb-4">
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider">WHAT WE DO?</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-12">
            The service we offer is specifically<br />designed to meet your needs
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12">
          <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-xl transition-shadow">
            <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">AI Image Generation</h3>
            <p className="text-muted-foreground leading-relaxed">
              Transform product photos into professional marketing images in seconds with cutting-edge AI technology
            </p>
          </div>
          
          <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-xl transition-shadow">
            <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Social Captions</h3>
            <p className="text-muted-foreground leading-relaxed">
              Generate engaging captions and hashtags for your images to boost engagement across all platforms
            </p>
          </div>
          
          <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-xl transition-shadow">
            <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Secure & Private</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your content is stored securely and only accessible by you. We prioritize your privacy and data security
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary to-accent rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Marketing?</h2>
          <p className="text-lg mb-8 opacity-90">Join thousands of businesses using AI to create stunning marketing content</p>
          <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="rounded-full">
            Get Started Today
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
