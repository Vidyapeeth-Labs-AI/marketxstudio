import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
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
  const [generating, setGenerating] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [modelTypes, setModelTypes] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchCredits();
        fetchData();
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

  const fetchData = async () => {
    const { data: categoriesData } = await supabase
      .from("business_categories")
      .select("id, name");
    
    const { data: modelsData } = await supabase
      .from("model_types")
      .select("id, name");

    if (categoriesData) setCategories(categoriesData);
    if (modelsData) setModelTypes(modelsData);
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

    setGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Upload product image to storage
      const fileName = `${user.id}/${Date.now()}-${uploadedImage.name}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product-images')
        .upload(fileName, uploadedImage);

      if (uploadError) {
        throw new Error('Failed to upload product image');
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Get category and model names
      const category = categories.find(c => c.id === selectedCategory);
      const model = modelTypes.find(m => m.id === selectedModel);

      console.log('Calling edge function with:', {
        categoryName: category?.name,
        modelTypeName: model?.name
      });

      // Get the session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call edge function with explicit auth header
      const { data, error } = await supabase.functions.invoke('generate-marketing-image', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          productImageUrl: urlData.publicUrl,
          categoryName: category?.name,
          modelTypeName: model?.name
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Generation failed');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Image generated successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} disabled={generating}>
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

        {generating && (
          <div className="mb-6 p-4 bg-primary/10 rounded-lg flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-primary font-medium">Generating your marketing image...</span>
          </div>
        )}

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

          <div className="flex flex-col items-center gap-4 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={!selectedCategory || !selectedModel || !uploadedImage || credits <= 0 || generating}
              size="lg"
              className="w-full sm:w-auto px-8"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Image (1 Credit)
                </>
              )}
            </Button>
            {credits <= 0 && (
              <p className="text-sm text-destructive">
                You don't have enough credits. Please contact support to get more.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Generate;
