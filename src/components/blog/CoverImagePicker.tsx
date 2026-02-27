import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, ImageIcon } from "lucide-react";
import type { GalleryImage } from "@/types";
import { generateAltTextFromFileName } from "@/lib/utils";

interface CoverImagePickerProps {
    galleryImages: GalleryImage[];
    value: string | null;
    onChange: (id: string | null) => void;
}

export const CoverImagePicker = ({ galleryImages, value, onChange }: CoverImagePickerProps) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedImage = useMemo(
        () => galleryImages.find((img) => img.id === value) ?? null,
        [galleryImages, value]
    );

    const filtered = useMemo(() => {
        if (!query.trim()) return galleryImages.slice(0, 20);
        const q = query.toLowerCase();
        return galleryImages
            .filter(
                (img) =>
                    (img.alt_text ?? "").toLowerCase().includes(q) ||
                    img.file_name.toLowerCase().includes(q) ||
                    (img.tags ?? []).some((t) => t.toLowerCase().includes(q))
            )
            .slice(0, 20);
    }, [galleryImages, query]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className="space-y-2">
            {/* Selected preview */}
            {selectedImage && (
                <div className="flex items-center gap-3 rounded-lg border p-2 bg-muted/40">
                    {selectedImage.image_url ? (
                        <img
                            src={selectedImage.image_url}
                            alt={selectedImage.alt_text ?? selectedImage.file_name}
                            className="h-14 w-20 rounded object-cover"
                        />
                    ) : (
                        <div className="flex h-14 w-20 items-center justify-center rounded bg-muted">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <span className="flex-1 text-sm truncate">
                        {selectedImage.alt_text || generateAltTextFromFileName(selectedImage.file_name)}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onChange(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search images by title, filename, tags…"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pl-8"
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-md">
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
                        <p className="px-3 py-4 text-center text-sm text-muted-foreground">No images match your search.</p>
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
