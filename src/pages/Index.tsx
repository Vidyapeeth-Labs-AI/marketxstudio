import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Rocket } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-12 w-12 text-primary-foreground animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground">
              AI Marketing Studio
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8">
            Transform your products into stunning marketing visuals with AI
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
              <Sparkles className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg shadow-card">
            <Zap className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Generate professional marketing images in seconds with cutting-edge AI
            </p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg shadow-card">
            <Shield className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Your images are stored securely and only accessible by you
            </p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg shadow-card">
            <Rocket className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Easy to Use</h3>
            <p className="text-muted-foreground">
              Simple guided workflow - no technical knowledge required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
