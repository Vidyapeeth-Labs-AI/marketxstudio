import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import CategorySelect from "@/components/generate/CategorySelect";
import ModelSelect from "@/components/generate/ModelSelect";
import ImageUpload from "@/components/generate/ImageUpload";
import GenerateButton from "@/components/generate/GenerateButton";

const Generate = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchCredits();
      }
    });
  }, [navigate]);

  const fetchCredits = async () => {
    const { data } = await supabase
      .from("user_credits")
      .select("credits")
      .single();

    if (data) {
      setCredits(data.credits);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCategory || !selectedModel || !uploadedImage) {
      toast.error("Please complete all steps");
      return;
    }

    if (credits <= 0) {
      toast.error("Insufficient credits");
      return;
    }

    // Implementation will be in edge function
    toast.success("Generation started!");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Generate Marketing Images</h1>
          <p className="text-muted-foreground">Follow the steps below to create stunning marketing visuals</p>
        </div>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Select Business Category
              </CardTitle>
              <CardDescription>Choose the category that best fits your product</CardDescription>
            </CardHeader>
            <CardContent>
              <CategorySelect value={selectedCategory} onChange={setSelectedCategory} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Upload Product Image
              </CardTitle>
              <CardDescription>Upload a clear image of your product</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload onImageSelect={setUploadedImage} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Choose Model Type
              </CardTitle>
              <CardDescription>Select the type of model for your marketing image</CardDescription>
            </CardHeader>
            <CardContent>
              <ModelSelect value={selectedModel} onChange={setSelectedModel} />
            </CardContent>
          </Card>

          <GenerateButton 
            onClick={handleGenerate}
            disabled={!selectedCategory || !selectedModel || !uploadedImage || credits <= 0}
            credits={credits}
          />
        </div>
      </main>
    </div>
  );
};

export default Generate;
