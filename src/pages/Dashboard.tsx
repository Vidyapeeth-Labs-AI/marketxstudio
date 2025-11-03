import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, Sparkles, Image as ImageIcon, MessageSquare, Video } from "lucide-react";
import { toast } from "sonner";
import ImageGallery from "@/components/ImageGallery";
import CaptionsGallery from "@/components/CaptionsGallery";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchCredits();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCredits = async () => {
    const { data, error } = await supabase
      .from("user_credits")
      .select("credits")
      .single();

    if (error) {
      console.error("Error fetching credits:", error);
    } else if (data) {
      setCredits(data.credits);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">MarketX Studio</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold">{credits} Credits</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-12">
          {/* Feature Cards */}
          <div>
            <h2 className="text-3xl font-bold mb-6">AI Marketing Tools</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="shadow-card hover:shadow-xl transition-shadow border-0 rounded-2xl">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Generate Images</CardTitle>
                  <CardDescription className="text-base">
                    Transform product photos into professional marketing images
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/generate")}
                    className="w-full rounded-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Generating
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-xl transition-shadow border-0 rounded-2xl">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Social Media Captions</CardTitle>
                  <CardDescription className="text-base">
                    Generate engaging captions and hashtags for your images
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/generate-captions")}
                    className="w-full rounded-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Captions
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-xl transition-shadow border-0 rounded-2xl opacity-60">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Marketing Videos</CardTitle>
                  <CardDescription className="text-base">
                    Create stunning marketing videos (Coming Soon)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full rounded-full"
                    disabled
                  >
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Your Creations Section */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Your Creations</h2>
            <Tabs defaultValue="images" className="w-full">
              <TabsList className="grid w-full md:w-auto grid-cols-3 rounded-full">
                <TabsTrigger value="images" className="rounded-full">Images</TabsTrigger>
                <TabsTrigger value="captions" className="rounded-full">Captions</TabsTrigger>
                <TabsTrigger value="videos" className="rounded-full">Videos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="images" className="mt-6">
                <ImageGallery onCreditsUpdate={fetchCredits} />
              </TabsContent>
              
              <TabsContent value="captions" className="mt-6">
                <CaptionsGallery />
              </TabsContent>
              
              <TabsContent value="videos" className="mt-6">
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Video generation coming soon!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    We're working on bringing you amazing AI-powered video creation tools.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
