import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiSelectPopover } from "@/components/MultiSelectPopover";
import type { GalleryImage } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  alt_text: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  published: z.boolean(),
});

type ImageEditFormValues = z.infer<typeof formSchema>;

interface ImageEditDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  image: GalleryImage;
  onSave: (updatedImage: GalleryImage) => void;
  uniqueTags: string[];
}

export const ImageEditDialog: React.FC<ImageEditDialogProps> = ({
  isOpen,
  onOpenChange,
  image,
  onSave,
  uniqueTags,
}) => {
  const form = useForm<ImageEditFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alt_text: image.alt_text || "",
      tags: image.tags || [],
      published: image.published,
    },
  });

  useEffect(() => {
    form.reset({
      alt_text: image.alt_text || "",
      tags: image.tags || [],
      published: image.published,
    });
  }, [image, form]);

  const handleSubmit = (values: ImageEditFormValues) => {
    onSave({
      ...image,
      alt_text: values.alt_text || null,
      tags: values.tags || null,
      published: values.published,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Image Metadata</DialogTitle>
          <DialogDescription>
            Update the alt text, tags, and publish status for this image.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="alt_text">Alt Text</Label>
            <Textarea
              id="alt_text"
              placeholder="A descriptive text for the image"
              {...form.register("alt_text")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <MultiSelectPopover
              suggestions={uniqueTags}
              value={form.watch("tags") || []}
              onChange={(selected) => form.setValue("tags", selected)}
              placeholder="Add tags..."
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <Label htmlFor="published">Published</Label>
            <Switch
              id="published"
              checked={form.watch("published")}
              onCheckedChange={(checked) => form.setValue("published", checked)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};