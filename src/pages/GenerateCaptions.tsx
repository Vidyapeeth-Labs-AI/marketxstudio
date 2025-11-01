import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Sparkles, Copy, Check, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  generated_image_url: string;
  created_at: string;
}

interface CaptionResult {
  image_url: string;
  caption: string;
  hashtags: string[] | string;
  captionId?: string;
}

const GenerateCaptions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedCaptions, setGeneratedCaptions] = useState<CaptionResult[]>([]);
  const [copiedCaptionIds, setCopiedCaptionIds] = useState<Set<string>>(new Set());

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
    setLoading(true);
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

  // Fallback function to fetch captions from database if response parsing fails
  const fetchGeneratedCaptionsFromDB = async (imageIds: string[]) => {
    try {
      // Fetch the most recently created captions
      // Since image_ids is JSONB, we'll fetch recent ones and filter client-side
      // Note: image_url might not exist yet if migration hasn't been applied
      const { data: dbCaptions, error: dbError } = await supabase
        .from('social_media_captions')
        .select('id, caption, hashtags, image_ids, created_at')
        .order('created_at', { ascending: false })
        .limit(50); // Get recent captions

      if (dbError) {
        console.error('Error fetching captions from DB:', dbError);
        return false;
      }

      if (dbCaptions && dbCaptions.length > 0) {
        // Filter captions that match our image IDs
        // image_ids is JSONB array like [imageId1, imageId2]
        const matchingCaptions = dbCaptions.filter((dbCaption: any) => {
          const captionImageIds = Array.isArray(dbCaption.image_ids) 
            ? dbCaption.image_ids 
            : [];
          // Check if any of our selected image IDs match any ID in this caption's image_ids
          return imageIds.some(id => captionImageIds.includes(id));
        });

        if (matchingCaptions.length > 0) {
          // Transform DB format to frontend format
          // Get image URLs from generated_images table if image_url doesn't exist
          const transformedCaptionsPromises = matchingCaptions.map(async (dbCaption: any) => {
            let imageUrl = dbCaption.image_url || '';
            
            // If image_url doesn't exist, try to get it from generated_images
            if (!imageUrl && dbCaption.image_ids && Array.isArray(dbCaption.image_ids) && dbCaption.image_ids.length > 0) {
              const firstImageId = dbCaption.image_ids[0];
              const { data: imageData } = await supabase
                .from('generated_images')
                .select('generated_image_url')
                .eq('id', firstImageId)
                .single();
              
              if (imageData) {
                imageUrl = imageData.generated_image_url;
                // Try to get signed URL if it's a storage path
                if (imageUrl && !imageUrl.startsWith('http')) {
                  const urlParts = imageUrl.split('/');
                  const fileName = urlParts.slice(-2).join('/');
                  const { data: signedData } = await supabase.storage
                    .from('generated-images')
                    .createSignedUrl(fileName, 3600);
                  if (signedData?.signedUrl) {
                    imageUrl = signedData.signedUrl;
                  }
                }
              }
            }
            
            return {
              image_url: imageUrl,
              caption: dbCaption.caption,
              hashtags: typeof dbCaption.hashtags === 'string' 
                ? dbCaption.hashtags.split(' ').filter((tag: string) => tag.trim())
                : [],
              captionId: dbCaption.id,
            };
          });
          
          const transformedCaptions = await Promise.all(transformedCaptionsPromises);

          if (transformedCaptions.length > 0) {
            setGeneratedCaptions(transformedCaptions);
            toast.success(`Found ${transformedCaptions.length} caption(s) from database!`);
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchGeneratedCaptionsFromDB:', error);
    }
    return false;
  };

  const handleGenerate = async () => {
    if (selectedImages.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setGenerating(true);
    setGeneratedCaptions([]);
    setIsDialogOpen(false);

    try {
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { imageIds: selectedImages }
      });

      // Log response for debugging
      console.log('Caption generation response:', { data, error, dataType: typeof data, dataKeys: data ? Object.keys(data) : null });

      // Check for error in response data
      if (error) {
        console.error('Supabase function error:', error);
        // Even if there's an error, captions might have been generated - try fetching from DB
        const foundInDB = await fetchGeneratedCaptionsFromDB(selectedImages);
        if (!foundInDB) {
          throw new Error(error.message || 'Failed to generate captions');
        }
        // If found in DB, exit early - don't throw
        return;
      }

      // Check if response has an error field
      if (data?.error) {
        console.error('Backend error:', data.error);
        // Try fetching from DB as fallback
        const foundInDB = await fetchGeneratedCaptionsFromDB(selectedImages);
        if (!foundInDB) {
          throw new Error(data.error);
        }
        // If found in DB, exit early - don't throw
        return;
      }

      // Check for captions in response - try multiple possible formats
      let captions = null;
      
      // Try direct captions array
      if (data?.captions && Array.isArray(data.captions)) {
        captions = data.captions;
      }
      // Try data being the array directly
      else if (Array.isArray(data)) {
        captions = data;
      }
      // Try nested in a response object
      else if (data?.data?.captions && Array.isArray(data.data.captions)) {
        captions = data.data.captions;
      }

      if (captions && captions.length > 0) {
        setGeneratedCaptions(captions);
        toast.success(`Generated ${captions.length} caption(s) successfully!`);
      } else {
        // If we can't parse the response, try fetching from database as fallback
        console.warn('Could not parse captions from response, fetching from database as fallback');
        const foundInDB = await fetchGeneratedCaptionsFromDB(selectedImages);
        if (!foundInDB) {
          // Only show error if we couldn't find them in DB either
          throw new Error(data?.error || "Could not retrieve captions. Please check the Creations section.");
        }
      }
    } catch (error: any) {
      console.error("Error generating captions:", error);
      
      // Try fetching from database as final fallback
      const foundInDB = await fetchGeneratedCaptionsFromDB(selectedImages);
      
      if (!foundInDB) {
        // Only show error if we couldn't find them in DB
        const errorMessage = error?.message || "Failed to generate captions. Please try again.";
        toast.error(errorMessage);
      }
      // If found in DB, the fetchGeneratedCaptionsFromDB function already shows success toast
    } finally {
      setGenerating(false);
      setSelectedImages([]); // Clear selection after generation
    }
  };

  const copyToClipboard = async (caption: CaptionResult) => {
    const hashtagArray = Array.isArray(caption.hashtags) 
      ? caption.hashtags 
      : typeof caption.hashtags === 'string' 
        ? caption.hashtags.split(' ').filter(tag => tag.trim())
        : [];
    const fullText = `${caption.caption}\n\n${hashtagArray.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedCaptionIds(prev => new Set([...prev, caption.captionId || caption.image_url]));
      setTimeout(() => {
        setCopiedCaptionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(caption.captionId || caption.image_url);
          return newSet;
        });
      }, 2000);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const getImageUrl = (imagePath: string) => {
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Otherwise, try to get public URL from storage
    const { data } = supabase.storage
      .from('generated-images')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const getThumbnailUrl = (imagePath: string) => {
    const url = getImageUrl(imagePath);
    // For thumbnails, we'll use the same URL but display at 40x40 size via CSS
    return url;
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
              Import images and generate context-aware captions with relevant hashtags
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Import Images</CardTitle>
              <CardDescription>
                Select images from your generated marketing images to create captions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No images found. Generate some marketing images first!</p>
                  <Button onClick={() => navigate("/generate")}>
                    Generate Images
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full sm:w-auto">
                        <Upload className="h-5 w-5 mr-2" />
                        Import Images ({images.length} available)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Select Images</DialogTitle>
                        <DialogDescription>
                          Choose one or more images to generate captions. Each image will get its own context-aware caption.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 py-4">
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
                              src={getThumbnailUrl(image.generated_image_url)}
                              alt="Generated marketing"
                              className="w-full h-10 object-cover"
                              style={{ width: '40px', height: '40px' }}
                            />
                            {selectedImages.includes(image.id) && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedImages([]);
                            setIsDialogOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleGenerate}
                          disabled={generating || selectedImages.length === 0}
                        >
                          {generating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Captions ({selectedImages.length})
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {selectedImages.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedImages.length} image(s) selected
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {generating && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Generating context-aware captions...</p>
              </CardContent>
            </Card>
          )}

          {generatedCaptions.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Generated Captions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedCaptions.map((captionResult, index) => {
                  const captionId = captionResult.captionId || captionResult.image_url || `caption-${index}`;
                  const isCopied = copiedCaptionIds.has(captionId);
                  
                  return (
                    <Card key={captionId} className="shadow-card">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <img
                            src={captionResult.image_url}
                            alt="Caption thumbnail"
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">Caption #{index + 1}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Caption:</p>
                          <p className="text-base leading-relaxed">{captionResult.caption}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Hashtags:</p>
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(captionResult.hashtags) 
                              ? captionResult.hashtags 
                              : typeof captionResult.hashtags === 'string'
                                ? captionResult.hashtags.split(' ').filter(tag => tag.trim())
                                : []
                            ).map((tag: string, tagIndex: number) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                              >
                                {tag.startsWith('#') ? tag : `#${tag}`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => copyToClipboard(captionResult)}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy to Clipboard
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GenerateCaptions;
