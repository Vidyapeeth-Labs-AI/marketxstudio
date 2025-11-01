import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  generated_image_url: string;
  created_at: string;
}

const GenerateCaptions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [generatedCaption, setGeneratedCaption] = useState<string>("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchImages();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from("generated_images")
      .select("id, generated_image_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching images:", error);
      toast.error("Failed to load images");
    } else {
      setImages(data || []);
    }
    setLoading(false);
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleGenerate = async () => {
    if (selectedImages.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setGenerating(true);
    setGeneratedCaption("");
    setGeneratedHashtags([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: { imageIds: selectedImages }
      });

      if (error) throw error;

      setGeneratedCaption(data.caption);
      setGeneratedHashtags(data.hashtags);
      toast.success("Caption generated successfully!");
    } catch (error) {
      console.error("Error generating caption:", error);
      toast.error("Failed to generate caption");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'caption' | 'hashtags') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'caption') {
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
      } else {
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2000);
      }
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('generated-images')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Generate Social Media Captions</h1>
            <p className="text-muted-foreground">
              Select one or more images to generate engaging captions and hashtags
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Images</CardTitle>
              <CardDescription>
                Choose from your previously generated marketing images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No images found. Generate some marketing images first!</p>
                  <Button className="mt-4" onClick={() => navigate("/generate")}>
                    Generate Images
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImages.includes(image.id)
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-primary/50'
                      }`}
                      onClick={() => toggleImageSelection(image.id)}
                    >
                      <img
                        src={getImageUrl(image.generated_image_url)}
                        alt="Generated marketing"
                        className="w-full aspect-square object-cover"
                      />
                      {selectedImages.includes(image.id) && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {images.length > 0 && (
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={generating || selectedImages.length === 0}
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Caption & Hashtags
                  </>
                )}
              </Button>
            </div>
          )}

          {generatedCaption && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Generated Caption</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCaption, 'caption')}
                    >
                      {copiedCaption ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copiedCaption ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{generatedCaption}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Hashtags</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedHashtags.map(h => `#${h}`).join(' '), 'hashtags')}
                    >
                      {copiedHashtags ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copiedHashtags ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {generatedHashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GenerateCaptions;