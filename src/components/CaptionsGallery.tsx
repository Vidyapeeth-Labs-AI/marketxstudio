import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Json } from "@/integrations/supabase/types";

interface Caption {
  id: string;
  caption: string;
  hashtags: string;
  image_ids: Json;
  created_at: string;
}

interface CaptionsGalleryProps {
  onRefresh?: () => void;
}

const CaptionsGallery = ({ onRefresh }: CaptionsGalleryProps) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCaptions();
  }, []);

  const fetchCaptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_media_captions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching captions:", error);
      toast.error("Failed to load captions");
    } else {
      setCaptions(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("social_media_captions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete caption");
    } else {
      toast.success("Caption deleted");
      fetchCaptions();
      onRefresh?.();
    }
    setDeleteId(null);
  };

  const copyToClipboard = async (caption: Caption) => {
    const text = `${caption.caption}\n\n${caption.hashtags}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(caption.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (captions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No captions generated yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {captions.map((caption) => (
          <Card key={caption.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">Caption</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(caption)}
                  >
                    {copiedId === caption.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(caption.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{caption.caption}</p>
              <div className="flex flex-wrap gap-2">
                {caption.hashtags.split(' ').map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(caption.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this caption? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CaptionsGallery;