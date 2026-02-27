import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, ImageIcon, Upload, Loader2 } from "lucide-react";
import type { GalleryImage } from "@/types";
import { generateAltTextFromFileName, sanitizeFileName } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";

interface CoverImagePickerProps {
  galleryImages: GalleryImage[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Called after a direct upload so the parent can refresh its image list */
  onUploaded?: (newImage: GalleryImage) => void;
}

export const CoverImagePicker = ({
  galleryImages,
  value,
  onChange,
  onUploaded,
}: CoverImagePickerProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const selectedImage = useMemo(
    () => galleryImages.find((img) => img.id === value) ?? null,
    [galleryImages, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return galleryImages.slice(0, 20);
    const q = query.toLowerCase();
    return galleryImages
      .filter(
        (img) =>
          (img.alt_text ?? "").toLowerCase().includes(q) ||
          img.file_name.toLowerCase().includes(q) ||
          (img.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [galleryImages, query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Direct upload handler
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Reset file input so the same file can be re-selected if needed
      e.target.value = "";

      setIsUploading(true);
      try {
        const sanitized = sanitizeFileName(file.name);
        const fileName = `${user.id}/${Date.now()}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("gallery").getPublicUrl(fileName);

        const altText = generateAltTextFromFileName(sanitized);

        const { data: inserted, error: dbError } = await supabase
          .from("gallery_images")
          .insert({
            user_id: user.id,
            file_name: fileName,
            image_url: publicUrl,
            published: false,
            alt_text: altText,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        const newImage = inserted as GalleryImage;
        showSuccess(`"${altText}" uploaded and selected.`);
        onChange(newImage.id);
        onUploaded?.(newImage);
      } catch (err) {
        showError((err as Error).message);
      } finally {
        setIsUploading(false);
      }
    },
    [user, onChange, onUploaded],
  );

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected preview */}
      {selectedImage && (
        <div className="flex items-center gap-3 rounded-lg border p-2 bg-muted/40">
          {selectedImage.image_url ? (
            <img
              src={selectedImage.image_url}
              alt={selectedImage.alt_text ?? selectedImage.file_name}
              className="h-14 w-20 rounded object-cover shrink-0"
            />
          ) : (
            <div className="flex h-14 w-20 items-center justify-center rounded bg-muted shrink-0">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <span className="flex-1 text-sm truncate">
            {selectedImage.alt_text ||
              generateAltTextFromFileName(selectedImage.file_name)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onChange(null)}
            title="Remove cover image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Search + Upload row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search gallery by title, filename, tags…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-8"
          />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          title="Upload a new image directly"
          disabled={isUploading || !user}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hint line */}
      <p className="text-xs text-muted-foreground">
        Searches images from your{" "}
        <span className="font-medium">Photography gallery</span>. Use{" "}
        <Upload className="inline h-3 w-3" /> to upload a new image directly.
      </p>

      {/* Dropdown */}
      {isOpen && (
        <div className="max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-md z-10 relative">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
              setQuery("");
            }}
          >
            No Cover Image
          </button>
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No images match your search.
            </p>
          )}
          {filtered.map((img) => (
            <button
              type="button"
              key={img.id}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                onChange(img.id);
                setIsOpen(false);
                setQuery("");
              }}
            >
              {img.image_url ? (
                <img
                  src={img.image_url}
                  alt={img.alt_text ?? img.file_name}
                  className="h-10 w-14 rounded object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 w-14 items-center justify-center rounded bg-muted shrink-0">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm truncate">
                {img.alt_text || generateAltTextFromFileName(img.file_name)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
